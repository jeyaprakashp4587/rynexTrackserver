import { DB1 } from "../config/db.js";
import { Driver } from "../modules/driver/models/driver.model.js";

const feedExistingDrivers = async () => {
  await DB1;

  const companyDrivers = await Driver.updateMany(
    {
      companyId: { $exists: true, $ne: null },
      $or: [
        { isIndependentDriver: { $exists: false } },
        { isIndependentDriver: null },
      ],
    },
    { $set: { isIndependentDriver: false } }
  );

  const independentDrivers = await Driver.updateMany(
    {
      $and: [
        { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
        {
          $or: [
            { isIndependentDriver: { $exists: false } },
            { isIndependentDriver: null },
          ],
        },
      ],
    },
    { $set: { isIndependentDriver: true } }
  );

  const statusResult = await Driver.updateMany(
    {
      $or: [
        { availability: { $exists: false } },
        { availability: null },
        { tripStatus: { $exists: false } },
        { tripStatus: null },
      ],
    },
    [
      {
        $set: {
          availability: { $ifNull: ["$availability", "AVAILABLE"] },
          tripStatus: { $ifNull: ["$tripStatus", "IDLE"] },
        },
      },
    ]
  );

  const matched =
    companyDrivers.matchedCount +
    independentDrivers.matchedCount +
    statusResult.matchedCount;
  const modified =
    companyDrivers.modifiedCount +
    independentDrivers.modifiedCount +
    statusResult.modifiedCount;

  console.log(
    `✅ Driver feed complete: ${matched} matches, ${modified} documents updated`
  );
};

if (process.argv[1]?.includes("driverStatus.feed.js")) {
  feedExistingDrivers()
    .then(() => DB1.close())
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error("❌ Driver feed error:", error);
      await DB1.close().catch(() => {});
      process.exit(1);
    });
}
