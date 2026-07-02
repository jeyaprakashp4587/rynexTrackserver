export const socketRooms = {
  tripRoom(tripId) {
    return `trip:${tripId}`;
  },
  userRoom(userId) {
    return `user:${userId}`;
  },
};
