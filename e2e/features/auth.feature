Feature: User Authentication
  As a user of LedgerCraft Studio
  I want to securely sign in and sign out
  So that my financial data remains protected

  Background:
    Given the application is launched

  Scenario: Successful login with valid credentials
    When I enter username "admin" and password "admin123"
    And I click the Sign In button
    Then I should be redirected to the dashboard
    And the navigation menu should be visible

  Scenario: Failed login with invalid credentials
    When I enter username "admin" and password "wrongpassword"
    And I click the Sign In button
    Then I should see an authentication error
    And I should remain on the login page

  Scenario: Sign In button is disabled without credentials
    Then the Sign In button should be disabled

  Scenario: Logout clears the session
    Given I am logged in as admin
    When I log out of the application
    Then I should be redirected to the login page
