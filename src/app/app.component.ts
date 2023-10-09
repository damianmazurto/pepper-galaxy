import { Component, OnInit } from '@angular/core';
import { Battle, BattleService, BattleState, InitState, ResourceType } from './services/battle.service';
import { BehaviorSubject, Observable, asyncScheduler, concatMap, delay, endWith, finalize, from, observeOn, of, startWith, tap } from 'rxjs';

interface Player {
  name: string;
  points: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit{
  currentBattle$: Observable<Battle>;
  isPreparingBattle$: Observable<boolean>;
  initialization$: Observable<InitState>;
  battleResolver$: Observable<string>;

  battleResources: ResourceType[] = this.battleService.BattleResources;
  selectedBattleType: ResourceType = 'people';
  players$: BehaviorSubject<{ player1: Player; player2: Player }> =
    new BehaviorSubject({
      player1: { name: 'player1', points: 0 },
      player2: { name: 'player2', points: 0 },
    });

  InitState = InitState;
  BattleState = BattleState;

  constructor(private battleService: BattleService) {
    this.currentBattle$ = this.battleService.currentBattle$.pipe(
      
    );
    this.isPreparingBattle$ = this.battleService.isPreparingBattle$;
    this.initialization$ = this.battleService.isInitialized$;
    this.battleResolver$ =  from(['3', '2', '1', 'Fight!','']).pipe(
      startWith('Ready'),
      concatMap((text) => of(text).pipe(delay(1000))),
      endWith(''),
      finalize(() => {
        this.battleService.resolveBattle();
      })
    )
  }

  ngOnInit(): void {
      this.currentBattle$.subscribe((battle) => {
        console.log('batttle', battle);
       if (battle?.state && (battle.state === BattleState.FIRST || battle.state === BattleState.SECOND || battle.state === BattleState.DRAFT)) {
          this.addPoints(battle.state);
        }
      })
  }

  startBattle() {
    this.battleService.prepareBattle(this.selectedBattleType);
  }

  addPoints(state: BattleState) {
    const { player1, player2 } = this.players$.value;

    player1.points += (state === BattleState.FIRST || state === BattleState.DRAFT) ? 1 : 0;
    player2.points += (state === BattleState.SECOND || state === BattleState.DRAFT) ? 1: 0;

    this.players$.next({player1, player2});
  }
} 
