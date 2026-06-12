export const formatRecipients = (recipients, assignedBy) => {
  return recipients.map((recipient) => ({
    userId: recipient.userId,
    driverId: recipient.driverId,
    vehicleId: recipient.vehicleId,
    assignedBy,
    status: "PENDING",
    assignedAt: new Date(),
  }));
};
