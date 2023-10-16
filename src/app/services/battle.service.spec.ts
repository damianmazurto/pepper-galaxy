import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BattleService } from './battle.service';
import { FandomService } from './fandom.service';
import { BattleState } from '../models/battle.model';
import { filter, of } from 'rxjs';

describe('BattleService', () => {
  let service: BattleService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FandomService, BattleService],
    });
    service = TestBed.inject(BattleService);
    httpTestingController = TestBed.inject(HttpTestingController);

    // Mock the HTTP requests for loading battle resources
    const peopleRequest = httpTestingController.expectOne(request => request.url.endsWith('/people/?page=1&limit=100'));
    peopleRequest.flush({ results: [{ uid: '1', name: 'Person 1' }, { uid: '2', name: 'Person 2' }] });

    const starshipsRequest = httpTestingController.expectOne(request => request.url.endsWith('/starships/?page=1&limit=100'));
    starshipsRequest.flush({ results: [{ uid: '1', name: 'Starship 1' }, { uid: '2', name: 'Starship 2' }] });
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should prepare a battle', (done) => {
    const type = 'people';

    // Spy on fetchWikiaImage method in the FandomService
    const fandomService = TestBed.inject(FandomService);
    const fetchWikiaImageSpy = spyOn(fandomService, 'fetchWikiaImage').and.returnValue(of('image-url'));

    service.prepareBattle(type);

    const req = httpTestingController.expectOne(request => request.url.endsWith(`/people/1`));
    req.flush({ result: { properties: { name: 'Person 1', image: 'image-url' }}})

    const req2 = httpTestingController.expectOne(request => request.url.endsWith(`/people/2`));
    req2.flush({ result: { properties: { name: 'Person 2', image: 'image-url' }}})

    service.currentBattle$.pipe(
        filter((battleState) => battleState.state !== BattleState.PREPARING)
    ).subscribe((battleState) => {
      expect(battleState.state).toBe(BattleState.FIGHT);
      expect(fetchWikiaImageSpy).toHaveBeenCalled();
      done();

    })   

});

  it('should resolve a battle for people', (done) => {
    const firstResource = { mass: '75' };
    const secondResource = { mass: '85' };

    // Set the initial battle state to FIGHT
    service['battle$'].next({ firstResource, secondResource, state: BattleState.FIGHT });

    service.resolveBattle();

    // Expect that the battle state changes based on the calcBattleFromPeople result
    service.currentBattle$.subscribe((battleState) => {
      expect(battleState.state).toBe(BattleState.SECOND);
      done();
    });
  });

  it('should resolve a battle for starships', (done) => {
    const firstResource = { crew: '99' };
    const secondResource = { crew: '75' };

    // Set the initial battle state to FIGHT
    service['battle$'].next({ firstResource, secondResource, state: BattleState.FIGHT });

    service.resolveBattle();

    // Expect that the battle state changes based on the calcBattleFromStarships result
    service.currentBattle$.subscribe((battleState) => {
      expect(battleState.state).toBe(BattleState.FIRST);
      done();
    });
  });

  

  // Add more test cases as needed for different scenarios and methods.
});