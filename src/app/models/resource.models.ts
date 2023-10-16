import { PeopleDetails } from "./people.model";
import { StarshipDetails } from "./starships.model";

export interface ResourceResult {
    uid: string,
    name: string,
    url: string;
}

export interface ResourceResponse {
    message: string,
    total_records: number,
    total_pages: number,
    results: ResourceResult[];
}

export interface ResourceDetailsResponse {
    message: string,
    result: {
      properties: ResourceDetails
    }
}

export type ResourceDetails = PeopleDetails | StarshipDetails;

export type ResourceType = 'people' | 'starships';

export type ResourceBattleData = {
    [key in ResourceType]: ResourceResult[];
};