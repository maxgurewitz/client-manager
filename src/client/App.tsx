import * as React from "react";
import { Redirect, BrowserRouter, Route, Switch, Link } from 'react-router-dom'
import * as qs from 'qs';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

const NoMatch = () => (
  <div> 404 </div>
);

const Dashboard = () => (
  <div>
    Home
  </div>
);

const Register = () => (
  <div>
    Create Project
    Register With Existing Project
  </div>
);

const AuthorizationPending = () => (
  <div>
    Authorization Pending
  </div>
);

const Loading = () => (
  <div>
    loading
  </div>
);

function randomString(length: number) {
    const bytes = new Uint8Array(length);
    const randomArray = crypto.getRandomValues(bytes);
    const random = randomArray ? randomArray.toString() : '';
    const result = [];
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._~'

    for (let i = 0; i < random.length; i++) {
      const randomNumber = Number(random.charAt(i));
      result.push(charset[randomNumber % charset.length]);
    };
    return result.join('');
}

const auth0ClientId = 'mhPJFvws1P7XvymutlWdQwUnCzItPlI3';
const auth0AuthorizeUrl = 'https://maxthegeek1.auth0.com/authorize';

const PublicHomePage = () => {
  const nonce = randomString(16);
  localStorage.setItem('nonce', nonce);

  const auth0Params = {
    nonce,
    redirect_uri: `${location.origin}/request-permission`,
    response_type: 'id_token',
    client_id: auth0ClientId
  };

  const createProjectParams = _.merge({}, auth0Params, {
    scope: 'admin',
    redirect_uri: `${location.origin}/dashboard`,
  });

  return (
    <div>
      <a href={`${auth0AuthorizeUrl}?${qs.stringify(createProjectParams)}`}>
        Create Project
      </a>

      <br/>

      <a href={`${auth0AuthorizeUrl}?${qs.stringify(auth0Params)}`}>
        Login or
      </a>
    </div>
  );
};

interface State {
  authenticationInProgress: boolean,
  isAuthenticated: boolean,
  isAuthorized: boolean,
  projectId: string | null
};

export const App = class App extends React.Component<any, State> {
  constructor(props: any) {
    super(props);

    const state = {
      authenticationInProgress: false,
      isAuthenticated: false,
      isAuthorized: false,
      projectId: null
    };

    const accessToken = localStorage.getItem('accessToken');
    const nonce = localStorage.getItem('nonce');

    if (accessToken && nonce) {
        state.authenticationInProgress = true;
        this.requestAuthentication(accessToken, nonce);
    }

    this.state = state;
  }

  requestAuthentication(accessToken: string, nonce: string) : Bluebird<String> {
    return Bluebird.resolve('projectId');
  }

  render() {
    return (
      <BrowserRouter>
        <Route path="/" render={() => {
          let component;

          if (this.state.authenticationInProgress) {
            component = <Loading/>;
          } else if (this.state.isAuthenticated && !this.state.projectId) {
            component = <Redirect to="/register"/>;
          } else if (this.state.isAuthenticated && !this.state.isAuthorized && this.state.projectId) {
            component = <Redirect to="/authorization-pending"/>;
          } else if (!this.state.isAuthenticated) {
            component =  location.pathname !== '/' ? <PublicHomePage/> : <Redirect to="/"/>;
          } else {
            // when user is authenticated, authorized, and with projectId
            component = (
              <Switch>
                <Route exact path="/" render={() => <Redirect to="/dashboard"/>}/>
                <Route exact path="/dashboard" component={Dashboard}/>
                <Route component={NoMatch}/>
              </Switch>
            );
          }
          return component;
        }}/>

      </BrowserRouter>
    );
  }
};
