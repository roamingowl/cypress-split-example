describe("Counter Page", () => {
    function openPage() {
        cy.visit("http://localhost:3000");
        cy.get("[data-test-name=sidebar-hamburger]").click();
        cy.get("[data-sidebar-link-name=counter]").click();
    }

    it("displays counter and two buttons", () => {
        openPage();
        cy.get("[data-test-name=counter-title]").should("have.text", "Count");
        cy.get("[data-test-name=count-number]").should("have.text", "0");
        cy.get("[data-test-name=count-up]").should("be.enabled");
        cy.get("[data-test-name=count-down]").should("be.disabled");
    })

    it("count up", () => {
        openPage();
        for (let i = 0; i < 3; i++) {
            cy.get("[data-test-name=count-number]").should("have.text", `${i}`);
            cy.get("[data-test-name=count-up]").click();
        }
        cy.get("[data-test-name=count-up]").should("be.enabled");
        cy.get("[data-test-name=count-down]").should("be.enabled");
    })

    it("count up and down", () => {
        openPage();
        cy.get("[data-test-name=count-number]").should("have.text", `0`);
        cy.get("[data-test-name=count-up]").click();
        cy.get("[data-test-name=count-number]").should("have.text", `1`);
        cy.get("[data-test-name=count-up]").should("be.enabled");
        cy.get("[data-test-name=count-down]").should("be.enabled");
        cy.get("[data-test-name=count-down]").click();
        cy.get("[data-test-name=count-number]").should("have.text", `0`);
        cy.get("[data-test-name=count-down]").should("be.disabled");
    })
})
