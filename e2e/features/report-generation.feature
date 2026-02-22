Feature: Report Generation
  As a user of LedgerCraft Studio
  I want to generate and view reports
  So that I can produce accurate client documents

  Background:
    Given I am logged in as admin

  Scenario: Navigate to the Reports page
    When I navigate to the "Reports" section
    Then the Reports page should be visible

  Scenario: Navigate to Generate Report page
    When I navigate to the "Generate Report" section
    Then the Generate Report page should be visible

  Scenario: Navigate to Templates page
    When I navigate to the "Templates" section
    Then the Templates page should be visible
