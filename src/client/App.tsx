import * as React from "react";
import { Redirect, BrowserRouter, Route, Switch, Link } from 'react-router-dom'
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import axios, {AxiosRequestConfig, AxiosError} from 'axios';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import SwitchButton from '@material-ui/core/Switch';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';

const NoMatch = () => (
  <div> 404 </div>
);

const Dashboard = ({state, logout}, {state: State, logout: any}) => (
  <div>
    Home
    <Button variant="contained" color="primary" onClick={logout}>
      Log Out
    </Button>
  </div>
);

const CreateProject = ({createProject, handleChange, state}: {createProject: any, handleChange: any, state: State}) => {
  return (
    <div>
      <TextField id="name" label="Project Name" onChange={handleChange('projectForm.name')} value={state.projectForm.name}/>
      <Button variant="contained" color="primary" onClick={createProject}>
        Create Project
      </Button>
    </div>
  );
}


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

const registerText = 'Register';
const logInText = 'Log In';

const PublicHomePage = ({login, createUser, handleChange, state}: {login: any, createUser: any, handleChange: any, state: State}) => {
  const registerFields = (
    <span>
      <TextField id="name" label="Full Name" onChange={ handleChange('userForm.name') } value={ state.userForm.name }/>
    </span>
  );

  return (
    <div>
      <TextField id="email" label="Email" onChange={ handleChange('userForm.email') } value={ state.userForm.email }/>
      <TextField id="password" label="Password" type="password" onChange={ handleChange('userForm.password') } value={ state.userForm.password }/>
      { state.userForm.register ? registerFields : '' }
      <Button variant="contained" color="primary" onClick={ state.userForm.register ? createUser : login }>
        { state.userForm.register ? registerText : logInText }
      </Button>
      <FormGroup>
        <FormControlLabel
          control={
            <SwitchButton
              checked={ state.userForm.register }
              onChange={ handleChange('userForm.register', 'checked') }
              value="registerUser"
            />
          }
          label={ !state.userForm.register ? registerText : logInText }
        />
      </FormGroup>
    </div>
  );
};

interface State   {
  userForm: {
    email: string,
    password: string,
    register: boolean,
    name: string
  },
  projectForm: {
    name: string,
    selected: number | null,
    create: boolean,
    projects: {
      id: number,
      name: string
    }[]
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
  register: false,
  name: ''
};

const emptyProjectForm = {
  name: '',
  selected: null,
  create: false,
  projects: []
};

export const App = class App extends React.Component<any, State> {
  constructor(props: any) {
    super(props);

    const sessionId = localStorage.getItem('sessionId') || null;

    let loadingProject = false;

    if (sessionId) {
      loadingProject = true;
      this.loadProject(sessionId);
    }

    const state = {
      userForm: _.clone(emptyUserForm),
      projectForm: _.clone(emptyProjectForm),
      loadingProject,
      isAuthenticated: false,
      isAuthorized: false,
      projectId: null,
      sessionId
    };

    this.state = state;
    this.createUser = this.createUser.bind(this);
    this.createProject = this.createProject.bind(this);
    this.logout = this.logout.bind(this);
    this.login = this.login.bind(this);
    this.listProjects = this.login.bind(this.listProjects);
  }

  handleChange = (path, eventPath = 'value') => event => {
    const value = event.target[eventPath];
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
        this.reset();
      } else if (status === 403) {
        this.setState({
          isAuthorized: false,
          isAuthenticated: true
        });
      }

      throw e;
    }
  }

  reset() {
    localStorage.removeItem('sessionId');
    this.setState({
      projectId: null,
      sessionId: null,
      isAuthorized: false,
      isAuthenticated: false
    });
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
      userForm: _.clone(emptyUserForm),
      isAuthenticated: true
    });
  }

  async logout() {
    this.reset();
    return this.request({
      method: 'post',
      url: '/api/logout'
    });
  }

  async listProjects() {
    const { projects } = await this.request({
      method: 'get',
      url: '/api/projects'
    });
  }

  async login() {
    this.setState({ loadingProject: true });

    try {
      const { sessionId } = await this.request({
        method: 'post',
        url: '/api/login',
        data: {
          email: this.state.userForm.email,
          password: this.state.userForm.password,
        }
      });

      localStorage.setItem('sessionId', sessionId);

      this.setState({
        sessionId,
        userForm: _.clone(emptyUserForm),
        isAuthenticated: true
      });

      await this.loadProject(sessionId);
    } catch (e) {
      this.setState({
        loadingProject: false
      });
    }
    return null;
  }

  async loadProject(sessionId: string) {
    try {
      const { project } = await this.request({
        url: '/api/projects/latest'
      }, sessionId);

      this.setState({
        projectId: project.id,
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
      projectForm: _.clone(emptyProjectForm),
      projectId: project.id,
      isAuthorized: true
    });
    return null;
  }

  render() {
    const self = this;
    return (
      <BrowserRouter>
        <Route path="/" render={(routerProps) => {
          let component;

          if (this.state.loadingProject) {
            component = <Loading/>;
          } else if (this.state.isAuthenticated && !this.state.projectId) {
            component = (
              <Switch>
                <Route exact path="/register" render={() => <CreateProject handleChange={this.handleChange} createProject={this.createProject} state={this.state}/>}/>
                <Route render={() => <Redirect to="/register"/>}/>
              </Switch>
            );
          } else if (this.state.isAuthenticated && !this.state.isAuthorized && this.state.projectId) {
            component = <Redirect to="/authorization-pending"/>;
          } else if (!this.state.isAuthenticated) {
            component = (
              <Switch>
                <Route exact path="/" render={() => <PublicHomePage handleChange={this.handleChange} state={this.state} createUser={this.createUser} login={this.login}/>}/>
                <Route render={() => <Redirect to="/"/>}/>
              </Switch>
            );
          } else {
            // when user is authenticated, authorized, and with projectId
            component = (
              <Switch>
                <Route exact path="/" render={() => <Redirect to="/dashboard"/>}/>
                <Route exact path="/dashboard" render={() => <Dashboard state={this.state} logout={this.logout}/>}/>
                <Route exact path="/register" render={() => this.state.projectId ? <Redirect to="/dashboard"/> : <CreateProject handleChange={this.handleChange} createProject={this.createProject} state={this.state}/>}/>
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
