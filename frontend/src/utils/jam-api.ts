import axios from "axios";

export interface ICompany {
  id: number;
  company_name: string;
  liked: boolean;
}

export interface ICollection {
  id: string;
  collection_name: string;
  companies: ICompany[];
  total: number;
}

export interface ICompanyBatchResponse {
  companies: ICompany[];
}

export interface IAddCompaniesToCollectionResponse {
  bulk_add_job_id: number;
}

export interface IAddCompaniesToCollectionInput {
  collectionId: string;
  companyIds?: number[];
  sourceCollectionId?: string;
}

export interface IBulkAddJob {
  bulk_add_job_id: number | null;
  status: string;
  added: number;
  total: number;
}

const BASE_URL = "http://localhost:8000";

export async function getCompanies(
  offset?: number,
  limit?: number
): Promise<ICompanyBatchResponse> {
  try {
    const response = await axios.get(`${BASE_URL}/companies`, {
      params: {
        offset,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching companies:", error);
    throw error;
  }
}

export async function getCollectionsById(
  id: string,
  offset?: number,
  limit?: number
): Promise<ICollection> {
  try {
    const response = await axios.get(`${BASE_URL}/collections/${id}`, {
      params: {
        offset,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching companies:", error);
    throw error;
  }
}

export async function getCollectionsMetadata(): Promise<ICollection[]> {
  try {
    const response = await axios.get(`${BASE_URL}/collections`);
    return response.data;
  } catch (error) {
    console.error("Error fetching companies:", error);
    throw error;
  }
}

export async function addCompaniesToCollection(
  input: IAddCompaniesToCollectionInput
): Promise<IAddCompaniesToCollectionResponse> {
  try {
    const response = await axios.post(
      `${BASE_URL}/collections/${input.collectionId}/companies`,
      {
        company_ids: input.companyIds,
        source_collection_id: input.sourceCollectionId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding companies to collection:", error);
    throw error;
  }
}

export async function getBulkAddJob(jobId: number): Promise<IBulkAddJob> {
  try {
    const response = await axios.get(`${BASE_URL}/bulk_add_jobs/${jobId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching bulk add job status:", error);
    throw error;
  }
}

export async function cancelBulkAddJob(jobId: number): Promise<IBulkAddJob> {
  try {
    const response = await axios.put(`${BASE_URL}/bulk_add_jobs/${jobId}`);
    return response.data;
  } catch (error) {
    console.error("Error canceling bulk add job:", error);
    throw error;
  }
}
