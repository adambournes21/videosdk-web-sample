/* eslint-disable no-restricted-globals */
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Card, Button } from 'antd';
import { IconFont } from '../../component/icon-font';
import './researcher.scss';
import { checkLoginCredentials } from '../../firebaseConfig'; // adjust the import path as needed
import { useAuth } from '../../authContext'; // Adjust the path as per your directory structure
import { fetchCurrentMeetings, FetchCurrentMeetingsResponse, haveUserJoinRoom, fetchPathsAndTimes, VideoDetail } from '../../firebaseConfig';
import { current } from 'immer';


const { Meta } = Card;
interface HomeProps extends RouteComponentProps {
  status: string;
  onLeaveOrJoinSession: () => void;
  createVideoToken: (topic: string, isResearcher: boolean) => any;
}

const Home: React.FunctionComponent<HomeProps> = (props) => {
  const { history, status, onLeaveOrJoinSession, createVideoToken } = props;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentMeetings, setCurrentMeetings] = useState<{ [key: string]: any }>([]); // Define state as an array of strings

  const [videoDetails, setVideoDetails] = useState<VideoDetail[]>([]);

  const authContext = useAuth();
  if (!authContext) {
    // Handle the case where auth context is null. For example:
    return null; // or some other appropriate handling
  }
  const { loggedInUsername, setLoggedInUsername, userGroup, setUserGroup, isResearcher, setIsResearcher } = authContext;

  useEffect(() => {
    // Check if user is already logged in
    const storedUsername = localStorage.getItem('loggedInUsername');
    const storedIsResearcher = localStorage.getItem('isResearcher');
    console.log("stored values: ", storedUsername, storedIsResearcher);
    const isResearcherBool = storedIsResearcher === 'true';

    if (storedUsername) {
      setLoggedInUsername(storedUsername);
      // Redirect to home page or dashboard as needed
      console.log("what is going on here: ", storedIsResearcher, !storedIsResearcher)
      if (!isResearcherBool) {
        history.push('/new-home')
      } else {
        history.push('/r');
      }
    }
  }, [setLoggedInUsername, history]);

  const handleLogout = () => {
    localStorage.removeItem('loggedInUsername');
    setLoggedInUsername(null);
    setUserGroup("");
    setIsResearcher(false);
    history.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await checkLoginCredentials(username, password);
    if (result.valid) {
      console.log('Login successful. Group:', result.group);
      setUserGroup(result.group)
      setLoggedInUsername(username);
      if (!status) {
        onLeaveOrJoinSession();
      }
    } else {
      console.log('Invalid username or password');
      // Handle invalid login, maybe show an error message
    }
  };

  const onCardClick = (topic: string) => {
      createVideoToken(topic, true).then(() => {
        history.push(`/video`);
        haveUserJoinRoom(username, userGroup);
      })
  };

  const featureList = [
    {
      key: 'video',
      icon: 'icon-meeting',
      title: 'Audio, video and share',
      description: 'Gallery Layout, Start/Stop Audio, Mute/Unmute, Start/Stop Video, Start/Stop Screen Share'
    }
  ];

  let actionText;
  if (status === 'connected') {
    actionText = 'Leave';
  } else if (status === 'closed') {
    actionText = 'Join';
  }

  useEffect(() => {
    const fetchMeetings = async () => {
      const response: FetchCurrentMeetingsResponse = await fetchCurrentMeetings();
      if (response.success && response.meetings) {
        setCurrentMeetings(response.meetings);
      } else {
        console.error(response.message || 'Failed to fetch current meetings');
      }
    };

    if (authContext?.loggedInUsername) {
      fetchMeetings();
      fetchPathsAndTimes(authContext.loggedInUsername).then(setVideoDetails);
    }

    if (loggedInUsername) {
    }
  }, [authContext?.loggedInUsername]);


  return (
    <div>
      {!loggedInUsername ? (
          <div className="login-container">
            <div className="login-box">
              <div className="login-box-content">
                <p className="login-title">Login</p>
                <form onSubmit={(e) => {
                  e.preventDefault(); // Prevents the default form submission behavior
                  handleSubmit(e);
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
            <p>you are logged in as {loggedInUsername}</p>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
          <div className="home">
            <h1>Zoom Video SDK feature</h1>
            <div className="feature-entry">
              {currentMeetings.map((meet: { [key: string]: any }) => {
                const id = Object.keys(meet)[0];
                const users = meet[id].users;
                console.log("users: ", users);
                return (
                  <Card
                    cover={<IconFont style={{ fontSize: '72px' }} type={"icon-meeting"} />}
                    hoverable
                    style={{ width: 320 }}
                    className="entry-item"
                    key={"video"}
                    onClick={() => onCardClick(id)}
                  >
                    <Meta title={id} description={users.join(', ')} />
                  </Card>
                );
              })}
            </div>
          </div>

        {loggedInUsername && (
        <div className="video-details">
          <h2>My Videos</h2>
          <ul>
            {videoDetails.map((video, index) => (
              <li key={index}>
                <a href={video.path} target="_blank">Path: {video.path}</a>
                <br />
                <span>Start Time: {new Date(video.startTime).toLocaleString("en-US", { timeZone: "America/New_York" })}</span>
                <br />
                <a href={('/r/' + video.index)}>View Video</a><br />
              </li>
            ))}
          </ul>
        </div>
        )}

        </div>
      )}
    </div>
  );
};
export default Home;
