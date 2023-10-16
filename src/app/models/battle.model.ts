import { ResourceDetails } from "./resource.models";

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