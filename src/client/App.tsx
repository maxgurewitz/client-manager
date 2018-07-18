import * as React from "react";
import { Redirect, BrowserRouter, Route, Switch, Link } from 'react-router-dom'
import * as qs from 'qs';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import axios from 'axios';

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
    // circumvents TS type bug
    const random = randomArray ? randomArray.toString().split(',').map(Number) : [];
    const result = [];
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._~'

    for (let i = 0; i < random.length; i++) {
      const randomNumber = random[i];
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
    audience: 'https://maxthegeek1.auth0.com/api/v2/',
    redirect_uri: location.origin,
    response_type: 'token id_token',
    client_id: auth0ClientId
  };
  const href = `${auth0AuthorizeUrl}?${qs.stringify(auth0Params)}`;

  return (
    <div>
      <a href={href}>
        Login/Register
      </a>
    </div>
  );
};

interface State {
  authenticationInProgress: boolean,
  isAuthenticated: boolean,
  isAuthorized: boolean,
  projectId: string | null,
  nonce: string | null,
  accessToken: string | null
};

export const App = class App extends React.Component<any, State> {
  constructor(props: any) {
    super(props);

    const hashParams = qs.parse(location.hash.substring(1));
    const accessToken = hashParams.access_token || localStorage.getItem('accessToken');
    const nonce = localStorage.getItem('nonce');

    let authenticationInProgress = false;

    if (accessToken && nonce) {
      authenticationInProgress = true;
      this.requestAuthentication(accessToken, nonce);
    }

    const state = {
      authenticationInProgress,
      isAuthenticated: false,
      isAuthorized: false,
      projectId: null,
      nonce,
      accessToken
    };

    this.state = state;
  }

  requestAuthentication(accessToken: string, nonce: string) : Promise<void> {
    return axios({
      url: '/api/authenticate',
      headers: {
        Authentication: `Bearer ${accessToken}`
      },
      data: {
        nonce
      }
    })
    .then(({ data }) => {
      const { projectId } = data;

      localStorage.setItem('accessToken', accessToken);
      this.setState({
        projectId,
        authenticationInProgress: false,
        isAuthorized: true,
        isAuthenticated: true
      });
    })
    .catch(e => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('nonce');

      if (e.response.status === '403') {
        this.setState({
          authenticationInProgress: false,
          isAuthorized: false,
          isAuthenticated: true
        });
      } else {
        this.setState({
          authenticationInProgress: false,
          isAuthorized: false,
          isAuthenticated: false
        });
      }
    });
  }

  render() {
    return (
      <BrowserRouter>
        <Route path="/" render={(routerProps) => {
          let component;

          if (this.state.authenticationInProgress) {
            component = <Loading/>;
          } else if (this.state.isAuthenticated && !this.state.projectId) {
            component = (
              <Switch>
                <Route exact path="/register" component={Register}/>
                <Route render={() => <Redirect to="/register"/>}/>
              </Switch>
            );
          } else if (this.state.isAuthenticated && !this.state.isAuthorized && this.state.projectId) {
            component = <Redirect to="/authorization-pending"/>;
          } else if (!this.state.isAuthenticated) {
            /* FIXME replace with Switch */
            if (routerProps.location.pathname === '/') {
              component = <PublicHomePage/>;
            } else {
              component = <Redirect to="/"/>;
            }
          } else {
            // when user is authenticated, authorized, and with projectId
            component = (
              <Switch>
                <Route exact path="/" render={() => <Redirect to="/dashboard"/>}/>
                <Route exact path="/dashboard" component={Dashboard}/>
                <Route exact path="/register" render={() => this.state.projectId ? <Redirect to="/dashboard"/> : <Register/>}/>
                <Route exact path="/authorization-pending" component={AuthorizationPending}/>
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
