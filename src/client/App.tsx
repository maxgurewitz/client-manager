import * as React from "react";
import { Redirect, BrowserRouter, Route, Switch, Link } from 'react-router-dom'
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import axios, {AxiosRequestConfig, AxiosError} from 'axios';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import SwitchButton from '@material-ui/core/Switch';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControlLabel from '@material-ui/core/FormControlLabel';

const AwaitingPermission = () => (
  <div> Waiting for permission from project administrator. </div>
);

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


class CreateProject extends React.Component<{ listProjects: any, handleChange: any, state: State, createProject: any, requestProjectPermissions: any }, any> {
  componentWillMount() {
    this.props.listProjects();
  }

  render() {
    return this.props.state.projectForm.create ?
      this.renderNewProject() :
      this.renderSelectProject();
  }

  renderNewProject() {
    return (
      <div>
        <TextField
          id="name"
          label="Project Name"
          onChange={this.props.handleChange('projectForm.name')}
          value={this.props.state.projectForm.name}/>

        <Button variant="contained" color="primary" onClick={this.props.createProject}>
          Create Project
        </Button>

        { this.renderSwitch() }
      </div>
    );
  }

  renderSwitch() {
    return (
      <FormGroup>
        <FormControlLabel
          control={
            <SwitchButton
              checked={ this.props.state.projectForm.create }
              onChange={ this.props.handleChange('projectForm.create', 'checked') }
              value="createProject"
            />
          }
          label={ !this.props.state.projectForm.create ? 'Create Project' : 'Select Project' }
        />
      </FormGroup>
    );
  }

  renderSelectProject() {
    const selectLabel = 'Select Project';
    return (
      <div>
        <FormControl style={ { minWidth: `${selectLabel.length + 5}ch` } }>
          <InputLabel htmlFor="project-select">{ selectLabel }</InputLabel>
          <Select
            value={this.props.state.projectForm.selected || ''}
            onChange={this.props.handleChange('projectForm.selected')}
            inputProps={{
              name: 'project',
              id: 'project-select',
            }}
          >
            {
              this.props.state.projectForm.projects.map(project => (<MenuItem key={project.id} value={project.id}> {project.name} </MenuItem>))
            }
          </Select>
        </FormControl>

        <Button variant="contained" color="primary" onClick={this.props.requestProjectPermissions}>
          Request
        </Button>
        { this.renderSwitch() }
      </div>
    );
  }

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

interface State {
  user: null | {
    name: string,
    id: number,
    email: string
  },
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
  awaitingPermission: boolean,
  loading: boolean,
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

    let loading = false;

    if (sessionId) {
      loading = true;
      this.loadProject(sessionId);
    }

    const state = {
      user: null,
      userForm: _.clone(emptyUserForm),
      projectForm: _.clone(emptyProjectForm),
      loading,
      isAuthenticated: false,
      isAuthorized: false,
      projectId: null,
      awaitingPermission: false,
      sessionId
    };

    this.state = state;

    const boundMethods = ['createUser', 'createProject', 'logout', 'login', 'listProjects', 'requestProjectPermissions'];

    boundMethods.forEach(method => {
      this[method] = this[method].bind(this);
    });
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
        const awaitingPermission = _.get(e, 'response.data.awaitingPermission', false);

        this.setState({
          awaitingPermission,
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
      user: null,
      projectId: null,
      sessionId: null,
      isAuthorized: false,
      isAuthenticated: false
    });
  }

  async createUser() {
    const { name, email, password } = this.state.userForm;

    const { user, sessionId } = await this.request({
      method: 'post',
      url: '/api/users',
      data: { name, email, password }
    });

    localStorage.setItem('sessionId', sessionId);

    this.setState({
      user,
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

    this.setState(state => _.set(state, 'projectForm.projects', projects));
  }

  async login() {
    this.setState({ loading: true });

    try {
      const { sessionId, user } = await this.request({
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
        loading: false
      });
    }
    return null;
  }

  async requestProjectPermissions() {
    if (this.state.projectForm.selected && this.state.user) {
      await this.assignPermissions(this.state.projectForm.selected, 2, this.state.user.id);
      this.setState({ awaitingPermission: true });
    }
  }

  async assignPermissions(projectId: number, level: number, targetId: number) {
    this.setState({
      loading: true
    });

    try {
      this.request({
        method: 'post',
        url: '/api/permissions',
        data: {
          projectId,
          targetId,
          level
        }
      });
    } finally {
      this.setState({
        loading: false
      });
    }
    return null;
  }

  async loadProject(sessionId: string) {
    try {
      const { user, project } = await this.request({
        url: '/api/projects/latest'
      }, sessionId);

      this.setState({
        user,
        projectId: project.id,
        loading: false,
        isAuthorized: true,
        isAuthenticated: true
      });
    } catch (e) {
      this.setState({
        user: _.get(e, 'response.data.user'),
        loading: false
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

          if (this.state.loading) {
            component = <Loading/>;
          } else if (this.state.isAuthenticated && this.state.awaitingPermission) {
            component = <AwaitingPermission/>;
          } else if (this.state.isAuthenticated && !this.state.projectId) {
            component = (
              <Switch>
                <Route exact path="/register" render={() => <CreateProject handleChange={this.handleChange} createProject={this.createProject} state={this.state} listProjects={this.listProjects} requestProjectPermissions={this.requestProjectPermissions}/>}/>
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
                <Route exact path="/register" render={() => this.state.projectId ? <Redirect to="/dashboard"/> : <CreateProject handleChange={this.handleChange} createProject={this.createProject} state={this.state} listProjects={this.listProjects} requestProjectPermissions={this.requestProjectPermissions}/>}/>
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
