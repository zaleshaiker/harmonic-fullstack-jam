import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany } from "../utils/jam-api";
import { Button } from "@mui/material";
import AddToCollectionModal from "./AddToCollectionModal";

const CompanyTable = (props: { selectedCollectionId: string }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<ICompany[]>([]);
  const [refetch, setFetch] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addEntireCollection, setAddEntireCollection] = useState(false);

  useEffect(() => {
    if (refetch) {
      setFetch(false);
    }

    getCollectionsById(props.selectedCollectionId, offset, pageSize).then(
      (newResponse) => {
        setResponse(newResponse.companies);
        setTotal(newResponse.total);
      }
    );
  }, [props.selectedCollectionId, offset, pageSize, refetch]);

  useEffect(() => {
    setOffset(0);
  }, [props.selectedCollectionId]);

  return (
    <div style={{ height: 600, width: "100%" }}>
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          <Button
            variant="contained"
            disabled={selected.length === 0}
            onClick={() => {
              setIsModalOpen(true);
              setAddEntireCollection(false);
            }}
          >
            Add To Collection
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setIsModalOpen(true);
              setAddEntireCollection(true);
            }}
          >
            Add All To Collection
          </Button>
        </div>
      </div>
      <DataGrid
        rows={response}
        rowHeight={30}
        columns={[
          { field: "liked", headerName: "Liked", width: 90 },
          { field: "id", headerName: "ID", width: 90 },
          { field: "company_name", headerName: "Company Name", width: 200 },
        ]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
        }}
        rowCount={total}
        pagination
        checkboxSelection
        paginationMode="server"
        onPaginationModelChange={(newMeta) => {
          setPageSize(newMeta.pageSize);
          setOffset(newMeta.page * newMeta.pageSize);
        }}
        onRowSelectionModelChange={(selectedIds) => {
          setSelected(response.filter((row) => selectedIds.includes(row.id)));
        }}
      />
      <AddToCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        addEntireCollection={addEntireCollection}
        collectionId={props.selectedCollectionId}
        selectedCompanies={selected}
        onAddToList={() => {
          setFetch(true);
        }}
      />
    </div>
  );
};

export default CompanyTable;
