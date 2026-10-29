export const findRecipientByUserId = (recipients = [], userId) =>
  recipients.find(
    (recipient) => recipient.userId.toString() === userId.toString()
  );
