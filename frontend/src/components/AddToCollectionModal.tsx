import {
  Box,
  Button,
  MenuItem,
  Modal,
  Select,
  Typography,
} from "@mui/material";
import { FC, useEffect, useMemo, useState } from "react";
import {
  addCompaniesToCollection,
  getCollectionsMetadata,
  IAddCompaniesToCollectionInput,
  IAddCompaniesToCollectionResponse,
  ICompany,
} from "../utils/jam-api";
import useApi from "../utils/useApi";
import useMutation from "../utils/useMutation";
import { BulkAddProgressBar } from "./BulkAddProgressBar";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "1px solid #bbb",
  borderRadius: "8px",
  boxShadow: 24,
  p: 4,
};

interface AddToCollectionModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly addEntireCollection: boolean;
  readonly collectionId: string;
  readonly selectedCompanies: ICompany[];
  readonly onAddToList: (listId: string) => void;
}

const AddToCollectionModal: FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  addEntireCollection,
  collectionId,
  selectedCompanies,
  onAddToList,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [jobId, setJobId] = useState<number | null | undefined>(undefined);
  const [jobCompleted, setJobCompleted] = useState(false);
  const [delayedWarning, setDelayedWarning] = useState(false);

  const { data: collectionResponse } = useApi(() => getCollectionsMetadata());
  const filteredCollections = useMemo(
    () =>
      collectionResponse?.filter(
        (collection) => collection.id !== collectionId
      ),
    [collectionResponse, collectionId]
  );

  useEffect(() => {
    if (filteredCollections && filteredCollections.length > 0) {
      setSelectedCollection(filteredCollections[0].id);
    }
  }, [filteredCollections]);

  const {
    mutate: addToCollection,
    loading,
    error,
    data,
  } = useMutation<
    IAddCompaniesToCollectionResponse,
    IAddCompaniesToCollectionInput
  >(addCompaniesToCollection);

  useEffect(() => {
    if (data) {
      setJobId(data.bulk_add_job_id);
      if (typeof data.bulk_add_job_id === "number") {
        setTimeout(() => {
          setDelayedWarning(true);
        }, 3000); // Warn after 3 seconds
      }
    }
  }, [data]);

  async function onCloseModal() {
    if (jobId && !jobCompleted) {
      return;
    }
    setJobId(undefined);
    setJobCompleted(false);
    setDelayedWarning(false);
    onClose();
  }

  async function onSubmit() {
    if (jobId === null || jobCompleted) {
      onCloseModal();
      return;
    }

    if (addEntireCollection) {
      await addToCollection({
        collectionId: selectedCollection,
        sourceCollectionId: collectionId,
      });
    } else {
      const companyIds = selectedCompanies.map((company) => company.id);
      await addToCollection({
        collectionId: selectedCollection,
        companyIds: companyIds,
      });
    }
    onAddToList(selectedCollection);
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          Add to Collection
        </Typography>
        <Typography id="modal-modal-description" sx={{ mt: 2, mb: 1 }}>
          Add{" "}
          {addEntireCollection ? "all" : `${selectedCompanies.length} selected`}{" "}
          companies to:
        </Typography>
        <Select
          onChange={(event) => setSelectedCollection(event.target.value)}
          value={selectedCollection}
          fullWidth
        >
          {filteredCollections?.map((collection) => (
            <MenuItem value={collection.id} key={collection.id}>
              {collection.collection_name}
            </MenuItem>
          )) || <></>}
        </Select>
        <div className="mt-2 mb-2">
          {jobId && (
            <BulkAddProgressBar
              jobId={jobId}
              onCompleted={() => setJobCompleted(true)}
            />
          )}
          {jobId === null && <span>Finished!</span>}
        </div>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            Something went wrong :(
          </Typography>
        )}
        {jobId && !jobCompleted && delayedWarning && (
          <Typography sx={{ mt: 2, mb: 1 }}>
            Please do not close this modal or window until the process is
            complete.
          </Typography>
        )}
        <div className="flex justify-end mt-4">
          <Button
            variant="outlined"
            onClick={onCloseModal}
            sx={{ mr: 2 }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={loading || (!!jobId && !jobCompleted)}
          >
            {jobId === null || jobCompleted ? "Close" : "Submit"}
          </Button>
        </div>
      </Box>
    </Modal>
  );
};

export default AddToCollectionModal;
