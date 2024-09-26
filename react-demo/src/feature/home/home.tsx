/* eslint-disable no-restricted-globals */
import React, { useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Card, Button } from 'antd';
import { IconFont } from '../../component/icon-font';
import './home.scss';

const { Meta } = Card;
interface HomeProps extends RouteComponentProps {
  status: string;
  onLeaveOrJoinSession: () => void;
}
const Home: React.FunctionComponent<HomeProps> = (props) => {
  const { history, status, onLeaveOrJoinSession } = props;

  const [loggingIn, setLoggingIn] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSuccessfulLogin = () => {
    setLoggingIn(false);
    setLoggedIn(true);
    console.log("you have logged in");
    if (!status) {
      onLeaveOrJoinSession();
    }
  }

  const onCardClick = (type: string) => {
      history.push(`/${type}${location.search}`);
  };
  const featureList = [
    {
      key: 'video',
      icon: 'icon-meeting',
      title: 'Audio, video and share',
      description: 'Gallery Layout, Start/Stop Audio, Mute/Unmute, Start/Stop Video, Start/Stop Screen Share'
    },
    {
      key: 'chat',
      icon: 'icon-chat',
      title: 'Session chat',
      description: 'Session Chat, Chat Priviledge'
    },
    {
      key: 'command',
      icon: 'icon-chat',
      title: 'Command Channel chat',
      description: 'Session Command Channel chat'
    },
    {
      key: 'subsession',
      icon: 'icon-group',
      title: 'Subsession',
      description: 'Open/Close Subsession, Assign/Move Participants into Subsession, Join/Leave Subsession'
    },
    {
      key: 'preview',
      icon: 'icon-meeting',
      title: 'Local Preview',
      description: 'Audio and Video preview'
    }
  ];
  
  let actionText;
  if (status === 'connected') {
    actionText = 'Leave';
  } else if (status === 'closed') {
    actionText = 'Join';
  }
  return (
    <div>
      {!loggedIn ? (
          <div className="login-container">
            <div className="login-box">
              <div className="login-box-content">
                <p className="login-title">Login</p>
                <form onSubmit={(e) => {
                  e.preventDefault(); // Prevents the default form submission behavior
                  console.log("hello")
                  handleSuccessfulLogin();
                }}>                  
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="login-input"
                    placeholder="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="login-input"
                    placeholder="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="submit" className="login-button">Login</button>
                </form>
              </div>
            </div>
          </div>
      ) : (
        <div>
          <div className="nav">
            <p>you are logged in</p>
          </div>
          <div className="home">
            <h1>Zoom Video SDK feature</h1>
            <div className="feature-entry">
              {featureList.map((feature) => {
                const { key, icon, title, description } = feature;
                return (
                  <Card
                    cover={<IconFont style={{ fontSize: '72px' }} type={icon} />}
                    hoverable
                    style={{ width: 320 }}
                    className="entry-item"
                    key={key}
                    onClick={() => onCardClick(key)}
                  >
                    <Meta title={title} description={description} />
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Home;
