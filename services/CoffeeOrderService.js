// services/CoffeeOrderService.js

class CoffeeOrderService {
    constructor() {
        this.orders = [];
    }

    addOrder(order) {
        this.orders.push(order);
    }

    getOrders() {
        return this.orders;
    }

    getOrderById(id) {
        return this.orders.find(order => order.id === id);
    }
}

module.exports = CoffeeOrderService;
