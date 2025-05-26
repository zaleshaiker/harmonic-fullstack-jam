import { FC, useState } from "react";
import { getBulkAddJob } from "../utils/jam-api";
import usePoll from "../utils/usePoll";

interface BulkAddProgressBarProps {
  readonly jobId: number;
  readonly onCompleted: () => void;
}

export const BulkAddProgressBar: FC<BulkAddProgressBarProps> = ({
  jobId,
  onCompleted,
}) => {
  const [added, setAdded] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");

  usePoll(
    () => getBulkAddJob(jobId),
    (data) => {
      setAdded(data.added);
      setTotal(data.total);
      setStatus(data.status);
    },
    (data) => data.status === "completed",
    () => onCompleted(),
    1000
  );

  const progress = total > 0 ? (added / total) * 100 : 0;

  let text = "";
  switch (status) {
    case "completed":
      text = "Complete!";
      break;
    case "canceled":
      text = "Canceled";
      break;
    case "in_progress":
      text = `Adding ${added} of ${total}...`;
      break;
    case "failed":
      text = "Failed to add companies.";
      break;
    default:
  }

  return (
    <div className="flex flex-col pt-2 pb-2 gap-2">
      {text}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-orange-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
