import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, concat, delay, forkJoin, map, mapTo, merge, mergeMap, of, reduce, retry, startWith, tap } from "rxjs";
import { FandomService } from "./fandom.service";
import { ResourceBattleData, ResourceDetails, ResourceDetailsResponse, ResourceResponse, ResourceType } from "../models/resource.models";
import { PeopleDetails } from "../models/people.model";
import { StarshipDetails } from "../models/starships.model";
import { Battle, BattleState, InitState } from "../models/battle.model";

const api = `https://www.swapi.tech/api`;

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
                resourceImage: this.fandomService.fetchWikiaImage(resource.name || ''),
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
        const firstMass = firstResource.mass === 'unknown' ? 0 : parseFloat(firstResource.mass);
        const secondMass = secondResource.mass === 'unknown' ? 0 : parseFloat(secondResource.mass);

        if (firstMass === secondMass) return BattleState.DRAFT;
       
        return (firstMass > secondMass) ? BattleState.FIRST : BattleState.SECOND
    }

    private calcBattleFromStarships(firstResource: StarshipDetails, secondResource: StarshipDetails): BattleState  {
        const firstCrew = firstResource.crew === 'unknown' ? 0 : parseFloat(firstResource.crew);
        const secondCrew = secondResource.crew === 'unknown' ? 0 : parseFloat(secondResource.crew);

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