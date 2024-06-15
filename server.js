const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
const socketIo = require('socket.io');
const querystring = require('querystring');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const SpotifyService = require('./services/SpotifyService');

const spotifyService = new SpotifyService();

const userRoutes = require('./routes/userRoutes');
const cafeRoutes = require('./routes/cafeRoutes');

const { User, Cafe, Session } = require('./models');

app.use(cors());
app.use(express.json());

io.on('connection', async (socket) => {
    console.log('Client connected');

    socket.on('join-room', async (data) => {
        const { shopId, token } = data;

        const cafe = await Cafe.findByPk(shopId);
        if (!cafe) {
            socket.emit('joined-failed'); // Inform client about failed join attempt
            return;
        }

        const session = await Session.findOne({ where: { token, isValid: true } });

        let user = null;
        if (session) {
            user = await User.findByPk(session.userId);
        }

        // Join the socket to the specified room
        console.log(socket.id);
        console.log(shopId);
        console.log(token);
        socket.join(shopId);

        // Add user to the room
        if (user) {
            spotifyService.addUserToRoom(shopId, user.userId, socket.id);
        }
        else {
            spotifyService.addUserToRoom(shopId, "guest", socket.id);
        }

        // Optionally, you can associate the socket with the user ID
        // For example, you can store the socket ID along with the user ID
        // in a mapping for later use
        const isSpotifyNeedLogin = spotifyService.getRoomDeviceId(shopId) == "" ? true : false;
        // Emit success message or perform any other actions
        socket.emit('joined-room', { shopId, isSpotifyNeedLogin });
        console.log(spotifyService.getUsersInRoom(shopId));
        console.log(spotifyService.getRoomDeviceId(shopId));
    });

    // Add event listener for leaving the room
    socket.on('leave-room', async (data) => {
        const { shopId } = data;
        socket.leave(shopId);
        spotifyService.removeUserBySocketId(socket.id); // Remove user from room based on socket ID
        console.log('Left room:', shopId);
    });

    socket.on('searchRequest', async (data) => {
        const { shopId, songName } = data;

        const songs = await spotifyService.searchSongs(shopId, songName);
        socket.emit('searchResponse', songs);
    });

    socket.on('songRequest', async (data) => {
        const { token, shopId, trackId } = data;
        if (token) {
            const session = await Session.findOne({ where: { token, isValid: true } });
            if (session) {
                const user = await User.findByPk(session.userId);
                if (user) {
                    spotifyService.addToQueue(shopId, user.userId, trackId);

                    const queue = await spotifyService.getQueue(shopId);
                    io.to(shopId).emit('updateQueue', queue);
                    console.log(shopId);
                    console.log(queue);
                }
            }
        }
    });

    socket.on('songVote', async (data) => {
        const { token, shopId, trackId, vote } = data;

        const session = await Session.findOne({ where: { token, isValid: true } });
        if (session) {
            const user = await User.findByPk(session.userId);
            if (user) {
                spotifyService.voteForSong(shopId, user.userId, trackId, vote);

                const queue = await spotifyService.getQueue(shopId);
                io.to(shopId).emit('updateQueue', queue);
            }
        }
    });

    socket.on('playOrPause', async (data) => {
        const { token, shopId, action } = data;

        const session = await Session.findOne({ where: { token, isValid: true } });
        if (session) {
            const user = await User.findByPk(session.userId);
            if (user.roleId == 2 && user.cafeId == shopId) {
                const player = await spotifyService.playOrPauseSpotify(shopId, action);
                if (player) {
                    io.to(shopId).emit('updatePlayer', action);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        spotifyService.removeUserBySocketId(socket.id); // Remove user from room based on socket ID
    });
});

//spotify login endpoint, for clerk
app.get('/login', async (req, res) => {
    const token = req.query.token;
    if (token == "null") {
        return res.redirect('http://localhost:3000');
    }

    const session = await Session.findOne({ where: { token, isValid: true } });
    const user = await User.findByPk(session.userId);
    if (user.roleId != 2) {
        return res.redirect('http://localhost:3000');
    }

    const scope = 'user-read-playback-state user-modify-playback-state';
    const shopId = user.cafeId; // Get shopId from the query parameters

    // Construct the authorization URL with the shopId as a query parameter
    const authorizationUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
            state: shopId // Include the shopId as the state parameter
        });

    // Redirect the user to the Spotify authorization page
    res.redirect(authorizationUrl);
});

//callback from spotify login, from spotify api
app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const shopId = req.query.state;

    const access_token = await spotifyService.getDeviceAccessToken(code, shopId);
    await spotifyService.getDeviceId(access_token, shopId);
    await spotifyService.transferPlayback(shopId);
    
    console.log("aacc" + spotifyService.getRoomDeviceId(shopId));
    res.redirect(`${process.env.FRONTEND_URI}/shop/${shopId}`);
});

// Periodically check the playback status and play the next song if needed
setInterval(async () => {
    for (const shopId in spotifyService.rooms) {
        const playbackState = await spotifyService.getCurrentPlaybackState(shopId);
        if (!spotifyService.rooms[shopId].paused) {
            if (!playbackState || !playbackState.is_playing) {
                await spotifyService.playInSpotify(shopId);
                const queue = await spotifyService.getQueue(shopId);
                io.to(shopId).emit('updateQueue', queue);
            } else {
                const queueItems = spotifyService.rooms[shopId].queue || [];
                const playbackState = await spotifyService.getCurrentPlaybackState(shopId);
                if (playbackState.item && playbackState.item.duration_ms) {
                    const remainingTime = playbackState.item.duration_ms - playbackState.progress_ms;
                    if (remainingTime <= 40000 && remainingTime > 12000 && spotifyService.rooms[shopId].nextTrack === "") {
                        // Use a while loop to handle removals and continue iterating correctly
                        let index = 0;
                        while (index < queueItems.length && spotifyService.rooms[shopId].nextTrack === "") {
                            const item = queueItems[index];
                            if (item[1].length < item[2].length) {
                                spotifyService.rooms[shopId].queue.splice(index, 1); // Remove the item from the queue
                                continue; // Skip to next iteration without incrementing index
                            }
                            else{
                                // If 20 seconds or less remaining, set the next track to be played
                                spotifyService.rooms[shopId].nextTrack = item[0];
                                console.log("set " + spotifyService.rooms[shopId].nextTrack);
                            }
                        }
                    }

                    if (remainingTime <= 12000 && spotifyService.rooms[shopId].nextTrack !== "") {
                        // If 10 seconds or less remaining and next track is set, add it to Spotify queue
                        await spotifyService.playNextInQueue(shopId, spotifyService.rooms[shopId].nextTrack);
                        spotifyService.rooms[shopId].nextTrack = "";
                    }
                } else {
                    console.log("No track is currently playing or duration information is not available.");
                }
            }
        }

        if(playbackState && playbackState.is_playing) io.to(shopId).emit('updateCurrentSong', playbackState.item);

        const queue = await spotifyService.getQueue(shopId);
        io.to(shopId).emit('updateQueue', queue);
        
        const room = spotifyService.rooms[shopId];
        
        // Reduce refreshTimeRemaining if greater than 0
        if (room.refreshTimeRemaining > 0) {
            room.refreshTimeRemaining -= 8000; // Decrease by 8000 ms (your interval)
        }
        else {
            try {
                await spotifyService.refreshAccessToken(shopId); // Call your refresh token function
                console.log("refreshing" + shopId)
            } catch (error) {
                console.error(`Failed to refresh token for room ${shopId}: ${error.message}`);
            }
        }
    }

    console.log("tick");
}, 8000);


// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch all other routes and return the React app's index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.use('/user', userRoutes);
app.use('/cafe', cafeRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
