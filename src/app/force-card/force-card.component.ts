import { Component, Input } from "@angular/core";
import { BattleService } from "../services/battle.service";
import { ResourceDetails } from "../models/resource.models";
import { BattleState } from "../models/battle.model";
import { PeopleDetails } from "../models/people.model";
import { StarshipDetails } from "../models/starships.model";

@Component({
    selector: 'force-card',
    templateUrl: './force-card.component.html',
    styleUrls: ['./force-card.component.scss']
})
export class ForceCardComponent {
    
    @Input() resource: ResourceDetails | null = null;
    @Input() winner: boolean = false;
    @Input() state!: BattleState;

    BattleState = BattleState;

    constructor(private battleService: BattleService) {

    }
    
    get peopleDetails(): PeopleDetails | false {
        return !!this.resource && this.battleService.isPeopleResource(this.resource) && this.resource as PeopleDetails;
    }

    get starshipDetails(): StarshipDetails | false {
        return !!this.resource && this.battleService.isStarshipResource(this.resource) && this.resource as StarshipDetails;
    }

    get isBattleResolved(): boolean {
        return this.state && (this.state === BattleState.FIRST || this.state === BattleState.SECOND || this.state === BattleState.DRAFT);
    }

}