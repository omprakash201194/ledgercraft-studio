Feature: Client Management
  As an administrator of LedgerCraft Studio
  I want to manage client records
  So that I can keep accurate client information

  Background:
    Given I am logged in as admin

  Scenario: Navigate to the Clients page
    When I navigate to the "Clients" section
    Then the Clients page should be visible

  Scenario: Search for a client
    When I navigate to the "Clients" section
    And I search for "admin"
    Then the search results should be displayed

  Scenario: View client details
    When I navigate to the "Clients" section
    Then I should see the client list area
