import uuid
from typing import Optional

from fastapi import (APIRouter, BackgroundTasks, Depends, HTTPException, Query,
                     status)
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import database
from backend.routes.bulk_add_jobs import JobStatus
from backend.routes.companies import (CompanyBatchOutput,
                                      fetch_companies_with_liked)

router = APIRouter(
    prefix="/collections",
    tags=["collections"],
)


class CompanyCollectionMetadata(BaseModel):
    id: uuid.UUID
    collection_name: str


class CompanyCollectionOutput(CompanyBatchOutput, CompanyCollectionMetadata):
    pass

class AddCompaniesToCollectionInput(BaseModel):
    company_ids: Optional[list[int]] = None
    source_collection_id: Optional[uuid.UUID] = None

class AddCompaniesToCollectionOutput(BaseModel):
    bulk_add_job_id: Optional[int]

@router.get("", response_model=list[CompanyCollectionMetadata])
def get_all_collection_metadata(
    db: Session = Depends(database.get_db),
):
    collections = db.query(database.CompanyCollection).all()

    return [
        CompanyCollectionMetadata(
            id=collection.id,
            collection_name=collection.collection_name,
        )
        for collection in collections
    ]


@router.get("/{collection_id}", response_model=CompanyCollectionOutput)
def get_company_collection_by_id(
    collection_id: uuid.UUID,
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    db: Session = Depends(database.get_db),
):
    query = (
        db.query(database.CompanyCollectionAssociation, database.Company)
        .join(database.Company)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
    )

    total_count = query.with_entities(func.count()).scalar()

    results = query.offset(offset).limit(limit).all()
    companies = fetch_companies_with_liked(db, [company.id for _, company in results])

    return CompanyCollectionOutput(
        id=collection_id,
        collection_name=db.query(database.CompanyCollection)
        .get(collection_id)
        .collection_name,
        companies=companies,
        total=total_count,
    )

def add_associations(
    db: Session,
    associations: list[database.CompanyCollectionAssociation],
    job_id: int,
):
    for association in associations:
        try:
            job = db.get(database.BulkAddJob, job_id)

            if job.status == JobStatus.CANCELLED:
                return

            db.add(association)
            job.added += 1
            if job.added == job.total:
                job.status = JobStatus.COMPLETED
            db.add(job)
            db.commit()
        except Exception as e:
            db.rollback()
            job.status = JobStatus.FAILED
            db.add(job)
            db.commit()
            raise e

@router.post("/{collection_id}/companies",  response_model=AddCompaniesToCollectionOutput)
def add_companies_to_collection(
    collection_id: uuid.UUID,
    input: AddCompaniesToCollectionInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    if input.company_ids is None and input.source_collection_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either company_ids or source_collection_id must be provided.",
        )
    
    if input.company_ids is not None and input.source_collection_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only one of company_ids or source_collection_id can be provided.",
        )
    
    if input.company_ids is not None:
        company_ids_set = set(input.company_ids)
        if len(company_ids_set) != len(input.company_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate company IDs are not allowed.",
            )

        companies = db.query(database.Company).filter(
            database.Company.id.in_(input.company_ids)
        ).all()
        if len(companies) != len(input.company_ids):
            missing_ids = set(input.company_ids) - {company.id for company in companies}
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Companies with IDs {missing_ids} do not exist.",
            )

        try:
            existing_associations = db.query(database.CompanyCollectionAssociation).filter(
                database.CompanyCollectionAssociation.collection_id == collection_id,
                database.CompanyCollectionAssociation.company_id.in_(input.company_ids),
            ).all()

            existing_company_ids = {assoc.company_id for assoc in existing_associations}
            new_company_ids = set(input.company_ids) - existing_company_ids

            if new_company_ids:
                new_associations = [
                    database.CompanyCollectionAssociation(
                        company_id=company_id, collection_id=collection_id
                    )
                    for company_id in new_company_ids
                ]
                
                bulk_add_job = database.BulkAddJob(
                    status=JobStatus.IN_PROGRESS,
                    added=0,
                    total=len(new_associations),
                )
                db.add(bulk_add_job)
                db.commit()

                background_tasks.add_task(
                    add_associations,
                    db,
                    associations=new_associations,
                    job_id=bulk_add_job.id,
                )

                return AddCompaniesToCollectionOutput(bulk_add_job_id=bulk_add_job.id)
        except Exception as e:
            print(f"Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while adding companies to the collection.",
            )
    
    elif input.source_collection_id is not None:
        source_collection = db.query(database.CompanyCollection).filter(
            database.CompanyCollection.id == input.source_collection_id
        ).first()
        if not source_collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source collection not found.",
            )

        try:
            existing_associations = db.query(database.CompanyCollectionAssociation).filter(
                database.CompanyCollectionAssociation.collection_id == collection_id,
                database.CompanyCollectionAssociation.company_id.in_(
                    db.query(database.CompanyCollectionAssociation.company_id).filter(
                        database.CompanyCollectionAssociation.collection_id == input.source_collection_id
                    )
                ),
            ).all()

            source_associatios = db.query(database.CompanyCollectionAssociation).filter(
                database.CompanyCollectionAssociation.collection_id == input.source_collection_id
            ).all()

            source_company_ids = {assoc.company_id for assoc in source_associatios}
            existing_company_ids = {assoc.company_id for assoc in existing_associations}
            new_company_ids = set(source_company_ids) - existing_company_ids

            if new_company_ids:
                new_associations = [
                    database.CompanyCollectionAssociation(
                        company_id=company_id, collection_id=collection_id
                    )
                    for company_id in new_company_ids
                ]
                
                bulk_add_job = database.BulkAddJob(
                    status=JobStatus.IN_PROGRESS,
                    added=0,
                    total=len(new_associations),
                )
                db.add(bulk_add_job)
                db.commit()

                background_tasks.add_task(
                    add_associations,
                    db,
                    associations=new_associations,
                    job_id=bulk_add_job.id,
                )

                return AddCompaniesToCollectionOutput(bulk_add_job_id=bulk_add_job.id)
        except Exception as e:
            print(f"Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while adding companies to the collection.",
            )
    
    return AddCompaniesToCollectionOutput(bulk_add_job_id=None)
