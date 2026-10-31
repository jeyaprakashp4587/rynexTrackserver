import {
  BSON_TYPE,
  TRIP_STATUS,
} from "../../constants/shared/trip.constants.js";
import {
  COMPANY_RUN,
} from "../../constants/company/company.constants.js";
import { mapAssignment } from "../../utils/shared/pipelineExpressions.js";

export const buildActiveAssignmentFilter = ({
  tripId,
  driverUserId,
  assignmentId,
  currentStopIndex,
}) => ({
  _id: tripId,
  companyRouteId: { $type: BSON_TYPE.OBJECT_ID },
  isTripEnded: false,
  activeDriverUserId: driverUserId,
  recipients: {
    $elemMatch: {
      _id: assignmentId,
      status: TRIP_STATUS.ACCEPTED,
      currentStopIndex,
    },
  },
});

export const buildEndRunUpdate = ({ assignmentId, completed, reason }) => {
  const assignmentPatch = completed
    ? { status: TRIP_STATUS.COMPLETED, completedAt: "$$NOW" }
    : {
        status: TRIP_STATUS.CANCELLED,
        cancelledAt: "$$NOW",
        cancelReason: { $literal: reason },
      };

  return [
    {
      $set: {
        recipients: mapAssignment(assignmentId, assignmentPatch),
        status: completed ? TRIP_STATUS.COMPLETED : TRIP_STATUS.CANCELLED,
        isTripEnded: true,
        completedAt: "$$NOW",
      },
    },
  ];
};

export const buildHandoverUpdate = ({ previousAssignmentId, assignment }) => [
  {
    $set: {
      recipients: {
        $concatArrays: [
          mapAssignment(previousAssignmentId, {
            status: TRIP_STATUS.CANCELLED,
            cancelledAt: "$$NOW",
            cancelReason: COMPANY_RUN.HANDOVER_CANCEL_REASON,
          }),
          { $literal: [assignment] },
        ],
      },
      activeDriverUserId: assignment.userId,
    },
  },
];
