import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, concat, delay, forkJoin, map, mapTo, merge, mergeMap, of, reduce, retry, startWith, tap } from "rxjs";
import { FandomService } from "./fandom.service";

const api = `https://www.swapi.tech/api`;

interface ResourceResult {
    uid: string,
    name: string,
    url: string;
}

interface ResourceResponse {
    message: string,
    total_records: number,
    total_pages: number,
    results: ResourceResult[];
}

interface ResourceDetailsResponse {
    message: string,
    result: {
      properties: ResourceDetails
    }
}

export interface PeopleDetails {
    height: number,
    mass: string | 'unknown',
    hair_color: string,
    skin_color: string,
    eye_color: string,
    birth_year: string,
    gender: string,
    name: string,
    homeworld: string,
    url: string,
    image?: string; 
}

export interface StarshipDetails {
    model: string,
    starship_class: string,
    manufacturer: string
    cost_in_credits: number,
    length: number,
    crew: number | 'unknown',
    passengers: number,
    max_atmosphering_speed: number,
    hyperdrive_rating: number,
    MGLT: number,
    cargo_capacity: number,
    consumables: string,
    pilots: [],
    name: string,
    image?: string; 
    url: string
}

export enum BattleState {
    FIRST = 'first',
    SECOND = 'second',
    DRAFT = 'draft',
    FIGHT = 'fight',
    PREPARING = 'preparing',
    PEACE = 'peace'
}

export enum InitState {
    LOADING = 'loading',
    LOADED = 'loaded',
    ERROR = 'error',
}

export interface Battle {
    firstResource: ResourceDetails | null,
    secondResource: ResourceDetails | null,
    state: BattleState;
}
export type ResourceDetails = PeopleDetails | StarshipDetails;

export type ResourceType = 'people' | 'starships';

type ResourceBattleData = {
    [key in ResourceType]: ResourceResult[];
};

@Injectable({
    providedIn: 'root'
})
export class BattleService {

    readonly BattleResources: ResourceType[] = ['people', 'starships'];
    private battleResoucesData$ = new BehaviorSubject<ResourceBattleData>({people: [], starships: []});
    private battle$ = new BehaviorSubject<Battle>({firstResource: null, secondResource: null, state: BattleState.PEACE});
    
    isInitialized$ = new BehaviorSubject<InitState>(InitState.LOADING);
    currentBattle$ = this.battle$.asObservable();
    isPreparingBattle$: Observable<boolean>;
    
    constructor(private http: HttpClient, private fandomService: FandomService) {
        this.isPreparingBattle$ = this.currentBattle$.pipe(
            map((battle) => battle?.state === BattleState.PREPARING),
        );

        this.loadBattleResources();
    }

    private fetchResourceForBattle(resource: ResourceType) {
        return this.http.get<ResourceResponse>(`${api}/${resource}/?page=1&limit=100`).pipe(
            map((data) => data.results)
        )
    }

    private loadBattleResources() {
        forkJoin(this.BattleResources.reduce((acc, res) => ({...acc, [res]: this.fetchResourceForBattle(res)}), {})).subscribe((resources) => {
            this.battleResoucesData$.next(resources);
            this.isInitialized$.next(InitState.LOADED);
        }, (error) => {
            this.isInitialized$.next(InitState.ERROR)
        })
    }

    private fetchResourceDetails(type: ResourceType, resourceUid: string): Observable<ResourceDetails> {
        return this.http.get<ResourceDetailsResponse>(`${api}/${type}/${resourceUid}`).pipe(
            map((res) => res.result.properties),
            retry(2)
        );
    }

    private pickTwoResources(type: ResourceType): Observable<Battle> {
        const resourceAmount = this.battleResoucesData$.value[type].length;

        const firstResourceIndex = Math.floor(Math.random() * resourceAmount);

        let secondResourceIndex ;

        do {
            secondResourceIndex = Math.floor(Math.random() * resourceAmount);
        } while (secondResourceIndex === firstResourceIndex)

        console.log(firstResourceIndex, secondResourceIndex);

        // using concat instead of forkjoin due to API limitations during concurrent requests
        return concat(
            this.fetchResourceDetails(type, this.battleResoucesData$.value[type][firstResourceIndex].uid).pipe(retry(2)),
            this.fetchResourceDetails(type, this.battleResoucesData$.value[type][secondResourceIndex].uid).pipe(retry(2)),
        ).pipe(
            delay(300),
            mergeMap((resource) => forkJoin({
                resource: of(resource),
                resourceImage: this.fandomService.fetchWikiaImage(resource.name),
            })),
            reduce((acc: ResourceDetails[], curr) => {
                return [...acc, {...curr.resource, image: curr.resourceImage}]
            }, []),
            map(([firstResource, secondResource]) => ({ firstResource, secondResource, state: BattleState.PEACE }))
        )
    }
    
    prepareBattle(type: ResourceType) {
        if (this.battle$.value?.state === BattleState.PREPARING || this.battle$.value?.state === BattleState.FIGHT) return;

        this.battle$.next({
            firstResource: null,
            secondResource: null,
            state: BattleState.PREPARING
        });

        this.pickTwoResources(type).pipe(
        ).subscribe((res) => {
            this.battle$.next({
                ...res,
                state: BattleState.FIGHT
            })
        })

    }

    resolveBattle() {
        const battle = this.battle$.value;

        if (battle === null || battle?.state !== 'fight') return;

        const { firstResource, secondResource, state } = battle;

        if (firstResource === null || secondResource === null) return;

        if (this.isPeopleResource(firstResource) && this.isPeopleResource(secondResource)) {
            this.battle$.next({
                firstResource, secondResource, state: this.calcBattleFromPeople(firstResource as PeopleDetails, secondResource as PeopleDetails)
            })
        }

        else if (this.isStarshipResource(firstResource) && this.isStarshipResource(secondResource)) {
            this.battle$.next({
                firstResource, secondResource, state: this.calcBattleFromStarships(firstResource as StarshipDetails, secondResource as StarshipDetails)
            })
        }

    }

    private calcBattleFromPeople(firstResource: PeopleDetails, secondResource: PeopleDetails): BattleState  {
        const firstMass = firstResource.mass === 'unknown' ? 0 : parseInt(firstResource.mass);
        const secondMass = secondResource.mass === 'unknown' ? 0 : parseInt(secondResource.mass);

        if (firstMass === secondMass) return BattleState.DRAFT;
       
        return (firstMass > secondMass) ? BattleState.FIRST : BattleState.SECOND
    }

    private calcBattleFromStarships(firstResource: StarshipDetails, secondResource: StarshipDetails): BattleState  {
        const firstCrew = firstResource.crew === 'unknown' ? 0 : firstResource.crew;
        const secondCrew = secondResource.crew === 'unknown' ? 0 : secondResource.crew;

        if (firstCrew === secondCrew) return BattleState.DRAFT;
       
        return (firstCrew > secondCrew) ? BattleState.FIRST : BattleState.SECOND
    }

    isPeopleResource(res: ResourceDetails): boolean {
        return ('mass' in res);
    }

    isStarshipResource(res: ResourceDetails): boolean {
        return ('crew' in res);
    }
}