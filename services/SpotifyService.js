const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class SpotifyService {
    constructor() {
        this.rooms = {}; // Store device and token info per room
        this.clientId = process.env.SPOTIFY_CLIENT_ID;
        this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    }

    async getAccessToken(roomId) {
        if (this.rooms[roomId]?.access_token) return this.rooms[roomId].access_token;
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                'grant_type': 'client_credentials'
            }), {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        this.rooms[roomId] = {
            ...this.rooms[roomId],
            access_token: response.data.access_token,
            nextTrack: ""
        };
        return response.data.access_token;
    }

    async getDeviceAccessToken(code, roomId) {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': process.env.SPOTIFY_REDIRECT_URI,
                'client_id': this.clientId,
                'client_secret': this.clientSecret
            }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token } = response.data;
        this.rooms[roomId] = {
            ...this.rooms[roomId],
            access_token,
            refresh_token,
            refreshTimeRemaining: 3600000,
            paused: false
        };

        return access_token;
    }

    async refreshAccessToken(roomId) {
        const refresh_token = this.rooms[roomId]?.refresh_token;
        if (!refresh_token) throw new Error("No refresh token available");
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
                'client_id': this.clientId,
                'client_secret': this.clientSecret
            }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token } = response.data;
        this.rooms[roomId] = {
            ...this.rooms[roomId],
            access_token,
            refreshTimeRemaining: 3600000
        };
        return access_token;
    }

    async getDeviceId(access_token, roomId) {
        const deviceResponse = await axios.get('https://api.spotify.com/v1/me/player/devices', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        if (deviceResponse.data.devices.length > 0) {
            this.rooms[roomId] = {
                ...this.rooms[roomId],
                deviceId: deviceResponse.data.devices[0].id
            };
        } else {
            this.rooms[roomId] = {
                ...this.rooms[roomId],
                deviceId: null
            };
        }
        return this.rooms[roomId].deviceId;
    }

    async searchSongs(shopId, query) {
        if (query === "") return null;
        const token = await this.getAccessToken(shopId);
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                q: query,
                type: 'track',
                limit: 5 // Limit the response to 5 songs
            }
        });

        return response.data.tracks.items.map(song => ({
            trackId: song.id,
            name: song.name,
            artist: song.artists[0].name,
            album: song.album.name,
            duration_ms: song.duration_ms,
            image: song.album.images[0].url
        }));
    }

    async getSongDetails(shopId, trackId) {
        const token = await this.getAccessToken(shopId);
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        const song = response.data;
        return {
            trackId: song.id,
            name: song.name,
            artist: song.artists[0].name,
            album: song.album.name,
            duration_ms: song.duration_ms,
            image: song.album.images[0].url
        };
    }

    async playOrPauseSpotify(roomId, action) {
        try {
            const room = this.rooms[roomId];
            if (!room) {
                console.error(`Room with ID ${roomId} does not exist`);
                return;
            }

            const deviceId = room.deviceId;
            if (!deviceId) {
                console.error("No device ID available for the specified room");
                return;
            }

            const token = await this.getAccessToken(roomId);
            if (!token) {
                console.error("Unable to get access token");
                return;
            }

            const playbackState = await this.getCurrentPlaybackState(roomId);
            if (playbackState) {
                room.paused = !playbackState.is_playing;
                if (action === "resume") {
                    if (!playbackState) {
                        console.error("Failed to get current playback state");
                        return;
                    }

                    const { context, item, progress_ms } = playbackState;
                    const contextUri = context?.uri;
                    const trackUri = item?.uri;

                    if (!trackUri) {
                        console.error("No track URI found in the current playback state");
                        return;
                    }

                    const url = 'https://api.spotify.com/v1/me/player/play';

                    await axios.put(url, {
                        device_id: deviceId,
                        uris: contextUri ? undefined : [trackUri],
                        context_uri: contextUri,
                        offset: contextUri ? { uri: trackUri } : undefined,
                        position_ms: progress_ms
                    }, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    room.paused = false; // Update the paused state if needed
                } else if (!room.paused && action === "pause") {
                    const url = 'https://api.spotify.com/v1/me/player/pause';

                    await axios.put(url, {
                        device_id: deviceId
                    }, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    room.paused = true; // Update the paused state if needed
                }
            }
        } catch (error) {
            console.error(`Error trying to ${action} Spotify playback:`, error);
        }
    }


    async getCurrentPlaybackState(roomId) {
        const access_token = this.rooms[roomId]?.access_token;
        if (!access_token) {
            console.error("No access token available");
            return null;
        }

        const deviceId = this.rooms[roomId]?.deviceId;
        if (!deviceId) {
            console.error("No device_id available");
            return null;
        }

        try {
            const response = await axios.get('https://api.spotify.com/v1/me/player', {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching current playback state:', error);
            return null;
        }
    }

    async transferPlayback(roomId) {
        try {
            const room = this.rooms[roomId];
            const token = await this.getAccessToken(roomId);
            if (!token) return;

            const response = await axios.put('https://api.spotify.com/v1/me/player', {
                device_ids: [room.deviceId],
                play: true
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 204) {
                console.log(`Successfully transferred playback to device: ${room.deviceId}`);
            } else {
                console.error(`Unexpected response status: ${response.status} when transferring playback`);
            }
        } catch (error) {
            console.error('Error transferring playback:', error);
        }
    }
    
    async playInSpotify(roomId) {
        try {
            const room = this.rooms[roomId];
            console.log("Attempting to play on device: " + room.deviceId);
            
            if (!room) return;
    
            const token = await this.getAccessToken(roomId);
            if (!token) return;
    
            const queue = room.queue || [];
            let deviceId = room.deviceId;
    
            if (!deviceId) {
                // Refresh device ID
                await this.getDeviceId(token);
                deviceId = this.rooms[roomId].deviceId;
            }
    
            if (!queue.length) return;
    
            const nextTrackId = queue[0][0] || "";
    
            // Attempt to play the next track
            await axios.put(`https://api.spotify.com/v1/me/player/play`, {
                uris: [`spotify:track:${nextTrackId}`],
                device_id: deviceId
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
    
            // Remove the played track from the queue
            queue.shift();
        } catch (error) {
            console.error('Error playing next track in Spotify:', error);
            // Check if playback started successfully
            const playbackState = await this.getCurrentPlaybackState(roomId);
            if (!playbackState || !playbackState.is_playing) {
                console.log("Playback did not start, transferring playback...");
                const ref = await this.refreshDeviceId(roomId);
                if(ref) this.playInSpotify(roomId);
            }
        }
    }
    
    async refreshDeviceId(roomId) {
        try {
            const token = await this.getAccessToken(roomId);
            if (!token) return;
    
            await this.getDeviceId(token);
            const newDeviceId = this.rooms[roomId].deviceId;
    
            // Transfer playback to the new device to start playback
            const transfer = await this.transferPlayback(roomId, newDeviceId);
            return transfer;
        } catch (error) {
            console.error('Error refreshing device ID and transferring playback:', error);
            return false;
        }
    }

    async transferPlayback(roomId, deviceId) {
        try {
            const token = await this.getAccessToken(roomId);
            if (!token) return;
    
            await axios.put(`https://api.spotify.com/v1/me/player`, {
                device_ids: [deviceId],
                play: true
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
    
            console.log(`Transferred playback to device ${deviceId}`);
            return true;
        } catch (error) {
            console.error('Error transferring playback:', error);
            return false;
        }
    }
    
    async playNextInQueue(roomId, trackId = null) {
        try {
            const queue = this.rooms[roomId]?.queue || { queue: [] };
            const deviceId = this.rooms[roomId]?.deviceId;
            if (!queue || !deviceId) return;
            if (queue.length == 0) return;

            const token = await this.getAccessToken(roomId);
            if (!token) return;

            const nextTrackId = trackId || (queue[0] ? queue[0][0] : "") || ""; // Use the provided trackId or the next track in the queue
            if (nextTrackId != "") {
                // Add the next track to the Spotify queue
                await axios.post(`https://api.spotify.com/v1/me/player/queue?uri=spotify:track:${nextTrackId}`, null, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                // Remove the added track from the queue
                queue.shift();
            }
        } catch (error) {
            console.error('Error playing next track in Spotify:', error);
            // Check if playback started successfully
            const playbackState = await this.getCurrentPlaybackState(roomId);
            if (!playbackState || !playbackState.is_playing) {
                console.log("Playback did not start, transferring playback...");
                const ref = await this.refreshDeviceId(roomId);
                if(ref) this.playNextInQueue(roomId, trackId || (queue[0] ? queue[0][0] : "") || "");
            }
        }
    }

    addToQueue(roomId, userId, trackId) {
        try {
            const room = this.rooms[roomId] || { queue: [] }; // Initialize queue as an empty array if it doesn't exist
            room.queue = room.queue || []; // Ensure room.queue is initialized as an empty array if it doesn't exist
            const existingIndex = room.queue.findIndex(item => item[0] === trackId);
            if (existingIndex !== -1) {
                // If the song already exists in the queue, just call voteForSong with the agree parameter
                this.voteForSong(roomId, userId, trackId, true);
            } else {
                // If the song is not in the queue, add it with the user's vote
                room.queue.push([trackId, [userId], []]);
            }
            this.rooms[roomId] = room;
        } catch (error) {
            console.error('Error adding to queue:', error);
            throw error;
        }
    }



    removeFromQueue(roomId, trackId) {
        try {
            const room = this.rooms[roomId];
            if (room) {
                room.queue = room.queue.filter(song => song[0] !== trackId);
            }
        } catch (error) {
            console.error('Error removing from queue:', error);
            throw error;
        }
    }

    async getQueue(roomId) {
        try {
            const room = this.rooms[roomId] || { queue: [] };
            if (!room.queue) return [];

            const detailedQueue = [];
            for (let [trackId, agree, disagree] of room.queue) {
                const songDetails = await this.getSongDetails(roomId, trackId);
                detailedQueue.push({
                    ...songDetails,
                    agree: agree.length,
                    disagree: disagree.length
                });
            }
            return detailedQueue;
        } catch (error) {
            console.error('Error getting queue:', error);
            throw error;
        }
    }

    voteForSong(roomId, userId, trackId, agreement) {
        try {
            const room = this.rooms[roomId];
            if (room) {
                const index = room.queue.findIndex(item => item[0] === trackId);
                if (index !== -1) {
                    // Check if userId already exists in the agreement or disagreement positions
                    const agreeIndex = room.queue[index][1].indexOf(userId);
                    const disagreeIndex = room.queue[index][2].indexOf(userId);

                    if (agreeIndex === -1 && disagreeIndex === -1) {
                        if (agreement) {
                            // If user has not already agreed, add userId to agreement position
                            room.queue[index][1].push(userId);
                        } else {
                            // If user has not already disagreed, add userId to disagreement position
                            room.queue[index][2].push(userId);
                        }
                    }

                    console.log(room.queue[index]);
                }
            }
        } catch (error) {
            console.error('Error voting for song:', error);
            throw error;
        }
    }

    // Get the next song in the queue
    getNextSong(roomId) {
        const room = this.rooms[roomId];
        return room && room.queue.length > 0 ? room.queue[0] : null;
    }

    // Remove the first song in the queue
    removeFirstSong(roomId) {
        const room = this.rooms[roomId];
        if (room) {
            room.queue.shift();
        }
    }

    // Add a user to a room
    addUserToRoom(roomId, userId, socketId) {
        try {
            if (!this.rooms[roomId]) {
                this.rooms[roomId] = { users: [] };
            }
            // Check if the user is already in the room
            const existingUserIndex = this.rooms[roomId].users.findIndex(user => user.userId === userId);
            if (existingUserIndex === -1) {
                // Add the user to the room
                this.rooms[roomId].users.push({ userId, socketId });
            } else {
                // If the user is already in the room, update the socketId
                this.rooms[roomId].users[existingUserIndex].socketId = socketId;
            }
        } catch (error) {
            // Handle any errors that occur during the user addition process
            console.error('Error adding user to room:', error);
        }
    }

    // Remove a user from a room
    removeUserBySocketId(socketId) {
        try {
            for (const roomId in this.rooms) {
                const userIndex = this.rooms[roomId].users.findIndex(user => user.socketId === socketId);
                if (userIndex !== -1) {
                    const userId = this.rooms[roomId].users[userIndex].userId;
                    this.removeUserFromRoom(roomId, userId);
                    break; // Assuming each user is in only one room, exit loop once found
                }
            }
        } catch (error) {
            // Handle any errors that occur during the user removal process
            console.error('Error removing user by socket ID:', error);
        }
    }

    getUsersInRoom(roomId) {
        try {
            return this.rooms[roomId]?.users || [];
        } catch (error) {
            console.error('Error getting users in room:', error);
            throw error;
        }
    }
    getRoomAccessToken(roomId) {
        try {
            return this.rooms[roomId].access_token || "";
        } catch (error) {
            console.error('Error getting room access token:', error);
            throw error;
        }
    }
    getRoomDeviceId(roomId) {
        try {
            return this.rooms[roomId].deviceId || "";
        } catch (error) {
            console.error('Error getting room device ID:', error);
            throw error;
        }
    }
}

module.exports = SpotifyService;
