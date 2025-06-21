# E2E Test Plan: Legacy Refactor Scenario

## 1. Objective

To establish a reliable, end-to-end (E2E) testing framework for the multi-agent debate system. This plan defines a test project with verifiable outcomes to measure the performance of the current prototype and provide a baseline for future enhancements.

## 2. Test Project: "Monolithic Calculator"

The test will be conducted on a new, self-contained project: a simple command-line calculator written in Python. The project will be intentionally designed with common "code smells," vulnerabilities, and architectural issues that a robust code review process should identify.

### Project Files:

*   `calculator.py`: A single Python file containing the entire application logic.
*   `requirements.txt`: A file listing any dependencies (initially none).

## 3. Verifiable Outcomes: The "Ground Truth" Checklist

The success of the E2E test is measured by comparing the agents' generated analysis against the following predefined list of expected findings.

| Stakeholder/Maintainer | Severity | Expected Finding |
| :--- | :--- | :--- |
| **`security_analyst`** | Critical | Identifies the use of `eval()` on raw user input as a major code injection vulnerability. |
| | High | Flags the lack of input sanitization, which could lead to crashes or unexpected behavior. |
| **`performance_analyst`** | Medium | Points out the inefficient use of string concatenation inside a loop. |
| | Low | Notes redundant or unoptimized calculations. |
| **`testing_advocate`** | Critical | Highlights the complete absence of a testing framework, unit tests, or integration tests. |
| **`documentation`** | High | Notes the missing `README.md` file. |
| | Medium | Identifies the lack of function docstrings and inline comments for complex code sections. |
| **`architecture`** | High | Criticizes the monolithic structure, where UI, logic, and state are improperly mixed. |
| | Medium | Points out the poor practice of using global variables for state management. |
| **`quality`** | High | Synthesizes the feedback from all stakeholders and recommends a significant refactor before approval. |

## 4. E2E Test Execution Steps

The test will be executed using the manual `workflow_dispatch` trigger for maximum control.

1.  **Setup Project:**
    *   Create a new directory named `test-project-calculator`.
    *   Inside this directory, create the `calculator.py` file with the intentionally flawed code.

2.  **Simulate a Pull Request:**
    *   Initialize a git repository within `test-project-calculator`.
    *   Commit the initial `calculator.py` to the `main` branch.
    *   Create a new branch (e.g., `add-readme`).
    *   On the new branch, create a `README.md` file with basic instructions.
    *   Commit the `README.md` file.
    *   Push the branches to a new GitHub repository.
    *   Open a Pull Request from the `add-readme` branch to `main`. Note the PR number.

3.  **Trigger the Debate:**
    *   Navigate to the "Actions" tab of the agent repository.
    *   Select the "Multi-Agent PR Debate" workflow.
    *   Run the workflow using the `workflow_dispatch` trigger.
    *   Provide the PR number from the test project repository when prompted.

4.  **Verify the Outcome:**
    *   Once the workflow completes, navigate to the Pull Request in the test project repository.
    *   Review the comments posted by each agent.
    *   Compare the agent comments against the "Ground Truth" checklist (Section 3).
    *   The test is considered successful if at least 80% of the critical and high-severity issues are correctly identified by the appropriate agents.

## 5. Scalability

This test can be scaled in the future by:
*   Increasing the complexity of the code base (e.g., multiple files, classes).
*   Introducing more subtle bugs (e.g., race conditions, logical errors).
*   Adding dependencies and testing the agents' ability to analyze dependency-related risks.