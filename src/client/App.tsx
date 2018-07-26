import * as React from "react";
import { Redirect, BrowserRouter, Route, Switch, Link } from 'react-router-dom'
import * as qs from 'qs';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import axios, {AxiosRequestConfig, AxiosError} from 'axios';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

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

const PublicHomePage = ({createUser, handleChange, state}: {createUser: any, handleChange: any, state: State}) => {
  return (
    <div>
      <TextField id="email" label="Email" onChange={handleChange('userForm.email')} value={state.userForm.email}/>
      <TextField id="password" label="Password" type="password" onChange={handleChange('userForm.password')} value={state.userForm.password}/>
      <TextField id="name" label="Full Name" onChange={handleChange('userForm.name')} value={state.userForm.name}/>
      <Button variant="contained" color="primary" onClick={createUser}>
        Register
      </Button>
    </div>
  );
};

interface State   {
  userForm: {
    email: string,
    password: string,
    name: string
  },
  projectForm: {
    name: string
  },
  loadingProject: boolean,
  isAuthenticated: boolean,
  isAuthorized: boolean,
  projectId: string | null,
  sessionId: string | null
};

const emptyUserForm = {
  email: '',
  password: '',
  name: ''
};

const emptyProjectForm = {
  name: ''
};

export const App = class App extends React.Component<any, State> {
  constructor(props: any) {
    super(props);

    const hashParams = qs.parse(location.hash.substring(1));
    const sessionId = localStorage.getItem('sessionId') || null;

    let loadingProject = false;

    if (sessionId) {
      loadingProject = true;
      this.loadProject(sessionId);
    }

    const state = {
      userForm: emptyUserForm,
      projectForm: emptyProjectForm,
      loadingProject,
      isAuthenticated: false,
      isAuthorized: false,
      projectId: null,
      sessionId
    };

    this.state = state;
    this.createUser = this.createUser.bind(this);
    this.createProject = this.createProject.bind(this);
  }

  handleChange = path => event => {
    const value = event.target.value;
    this.setState(state =>
      _.set(state, path, value)
    );
  };

  async request(config: AxiosRequestConfig, sessionId?: string) {
    _.set(config, 'headers.Authorization', sessionId || this.state.sessionId);

    try {
      const {data} = await axios(config);
      return data;
    } catch (e) {
      const error = e as AxiosError;
      const status: number = _.get(error, 'response.status');

      if (status === 401) {
        localStorage.removeItem('sessionId');
        this.setState({
          sessionId: null,
          isAuthorized: false,
          isAuthenticated: false
        });
      } else if (status === 403) {
        this.setState({
          isAuthorized: false,
          isAuthenticated: true
        });
      }

      throw e;
    }
  }

  async createUser() {
    const { name, email, password } = this.state.userForm;

    const { sessionId } = await this.request({
      method: 'post',
      url: '/api/users',
      data: { name, email, password }
    });

    localStorage.setItem('sessionId', sessionId);

    this.setState({
      sessionId,
      userForm: emptyUserForm,
      isAuthenticated: true
    });
  }

  async loadProject(sessionId: string) {
    try {
      const { project } = await this.request({
        url: '/api/projects/latest'
      }, sessionId);

      this.setState({
        projectId: project.projectId,
        loadingProject: false,
        isAuthorized: true,
        isAuthenticated: true
      });
    } catch (e) {
      this.setState({
        loadingProject: false
      });
    }
    return null;
  }

  async createProject() {
    const { project } = await this.request({
      method: 'post',
      url: '/api/projects',
      data: {
        name: this.state.projectForm.name
      }
    });

    this.setState({
      projectForm: emptyProjectForm,
      projectId: project.id,
      isAuthorized: true
    });
    return null;
  }

  render() {
    return (
      <BrowserRouter>
        <Route path="/" render={(routerProps) => {
          let component;

          if (this.state.loadingProject) {
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
              component = <PublicHomePage handleChange={this.handleChange} state={this.state} createUser={this.createUser}/>;
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
