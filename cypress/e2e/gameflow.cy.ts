/// <reference types="cypress" />

context('Game flow', () => {

  it('initialize and start battle', () => {
      cy.intercept('GET', 'https://www.swapi.tech/api/people/?page=1&limit=100').as('getPeople')
      cy.intercept('GET', 'https://www.swapi.tech/api/starships/?page=1&limit=100').as('getStarship')
      
      cy.visit('/')
      cy.wait('@getPeople').then(({response}) => {
          const peopleLength = response.body.results.length;
          cy.wrap(peopleLength).as('peopleLength');

          expect(response.statusCode).to.eq(200)
          expect(response.body).to.have.property('results').to.length.greaterThan(10)
      })
      
      cy.wait('@getStarship').then(({response}) => {
          const peopleLength = response.body.results.length;
          cy.wrap(peopleLength).as('peopleLength');
          

          expect(response.statusCode).to.eq(200)
          expect(response.body).to.have.property('results').to.length.greaterThan(10)
      })


      cy.intercept('GET', 'https://www.swapi.tech/api/people/**').as('getResource')
      cy.intercept('GET', ' https://starwars.fandom.com/api.php?action=parse&prop=text&origin=*&format=json&page=**').as('getFandomResource')
      cy.intercept('GET', 'https://pixlr.com/proxy/?url=https://static.wikia.nocookie.net/starwars/images/**').as('getImageResource')

    
      cy.get('button').should('be.visible').click({force:true});
    
      cy.wait(['@getResource', '@getResource']).then((response) => {
          console.log(response);
          expect(response).to.have.lengthOf(2);

          const players = [response[0].response.body.result.properties.name, response[1].response.body.result.properties.name];
          cy.wrap(players).as('players');
      })

      cy.wait(['@getFandomResource', '@getFandomResource']).then((response) => {
      console.log(response);
      expect(response).to.have.lengthOf(2);
      })
      
      cy.wait(['@getImageResource', '@getImageResource']).then((response) => {
      console.log(response);
      expect(response).to.have.lengthOf(2);

      })

      expect(cy.get('#player1 .mat-mdc-card-image')
          .should('have.css', 'background-image')
          .should('not.be.null'));
      
      expect(cy.get('#player2 .mat-mdc-card-image')
      .should('have.css', 'background-image')
      .should('not.be.null'));
      
   
      cy.get('@players').then((players) => {
          cy.get('#player1 .mat-mdc-card-title').invoke('text').then((t) => {
              console.log(t)
              expect(t).to.be.oneOf(players)
          })
          
          cy.get('#player2 .mat-mdc-card-title').invoke('text').then((t) => {
              expect(t).to.be.oneOf(players)
          })
      })

      cy.wait(1000).then(() => {
          cy.get('.battle-resolver').invoke('text').then((t) => {
              expect(t.trim()).to.eq('Ready')
          })
      })
      cy.wait(1000).then(() => {
          cy.get('.battle-resolver').invoke('text').then((t) => {
              expect(t.trim()).to.eq('3')
          })
      })

      cy.wait(1000).then(() => {
          cy.get('.battle-resolver').invoke('text').then((t) => {
              expect(t.trim()).to.eq('2')
          })
      })

      cy.wait(1000).then(() => {
          cy.get('.battle-resolver').invoke('text').then((t) => {
              expect(t.trim()).to.eq('1')
          })
      })

      cy.wait(1000).then(() => {
          cy.get('.battle-resolver').invoke('text').then((t) => {
              expect(t.trim()).to.eq('Fight!')
          })
      })
     
      
  })

})

