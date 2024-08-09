describe("Items List Page", () => {

    function openPage() {
        cy.visit("http://localhost:3000");
        cy.get("[data-test-name=sidebar-hamburger]").click();
        cy.get("[data-sidebar-link-name=itemslist]").click();
    }

    function addItem() {
        cy.get("[data-test-name=add-item-button]").click();
    }

    it("displays list with enabled add button", () => {
        openPage();
        cy.get("[data-test-name=page-title]").should("have.text", "List of items");
        cy.get("[data-test-name=items-list]").find('li.MuiListItem-root').should('have.length', 0);
        cy.get("[data-test-name=items-count]").should("have.text", "Current count: 0");
        cy.get("[data-test-name=add-item-button]").should("be.enabled");
    })

    it("add button adds an item", () => {
        openPage();
        for (let i=0; i<3; i++) {
            addItem();
            cy.get("[data-test-name=items-list]").find('li.MuiListItem-root').should('have.length', i + 1);
            cy.get("[data-test-name=items-list]").find(`[data-test-name=list-item-${i}]`).should('contain.text', `Item ${i + 1}`);
            cy.get("[data-test-name=items-list]").find(`[data-test-name=list-item-${i}]`).find('button').should('exist');
            cy.get("[data-test-name=items-count]").should("have.text", `Current count: ${i+ 1}`);
        }
    })

    it("remove button removes an item", () => {
        openPage();
        addItem();
        cy.get("[data-test-name=items-list]").find('[data-test-name=list-item-0]').find('button').click()
        cy.get("[data-test-name=items-list]").find('li.MuiListItem-root').should('have.length', 0);
        cy.get("[data-test-name=items-count]").should("have.text", "Current count: 0");
    })
})
