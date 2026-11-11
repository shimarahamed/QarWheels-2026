export function assertDevelopmentProject(environment, args, account, reset = false) {
  if (environment.QARWHEEL_ENV !== 'development' || environment.NODE_ENV === 'production') {
    throw new Error('Demo data operations require QARWHEEL_ENV=development and must not run in production.');
  }
  const index = args.indexOf('--project');
  const project = index >= 0 ? args[index + 1] : undefined;
  if (!project || project.startsWith('--') || project !== account.project_id) {
    throw new Error('Pass --project <development-project-id> matching FIREBASE_SERVICE_ACCOUNT_KEY.');
  }
  const clientProject = environment.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (clientProject && clientProject !== project) throw new Error('Client and service-account Firebase projects must match.');
  if (reset && !args.includes('--yes-i-mean-it')) throw new Error('Reset requires an explicit --yes-i-mean-it argument.');
}
