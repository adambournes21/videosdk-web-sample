import { getExploreName } from '../utils/platform';

export const devConfig = {
  sdkKey: 'EQOW1zSRTSaSYxUcBKc-Xg',
  sdkSecret: 'RKyMFxJXngMS9RPUWgNgiRxp8LBW0dATIZ1P',
  webEndpoint: 'zoom.us',
  topic: 'dev',
  name: `${getExploreName()}-${Math.floor(Math.random() * 1000)}`,
  password: '12345',
  signature: '',
  sessionKey: '',
  userIdentity: '',
  // role = 1 to join as host, 0 to join as attendee. The first user must join as host to start the session
  role: 1
};
