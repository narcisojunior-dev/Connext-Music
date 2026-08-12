# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Agent Skills Usage

Utilize the following workspace-installed skills during development:
- **react-native-testing**: Use when writing, reviewing, or fixing unit and integration tests using React Native Testing Library (RNTL).
- **react-navigation**: Use when implementing navigation, configuring headers/tabs/modals, and handling safe area insets.
- **react-native-best-practices**: Refer to for optimizing performance (Hermes, re-renders, FlatList, memory, bundle size).
- **github-actions**: Use when editing or establishing CI/CD pipelines.

## Task Lifecycle and Graphify Updates

- **Sequential Issue Progress:** You MUST develop, test, and commit one issue at a time. Only start the next issue in the sequence after the current one has been fully implemented, tested, and committed.
- After finishing and successfully testing every single task/issue, you **MUST** run the `graphify` skill using `/graphify . --update` to keep the project knowledge graph and `GRAPH_REPORT.md` updated.
- Make sure to review the graph report or query it if you need architectural guidance.
