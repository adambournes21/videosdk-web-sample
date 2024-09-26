/* eslint-disable no-restricted-globals */
import React, { useState, useEffect } from 'react';
import { RouteComponentProps, useParams } from 'react-router-dom';
import { Card, Button } from 'antd';
import { IconFont } from '../../component/icon-font';
import './view-video.scss';
import { checkLoginCredentials } from '../../firebaseConfig'; // adjust the import path as needed
import { useAuth } from '../../authContext'; // Adjust the path as per your directory structure
import { fetchCriticalMoments } from '../../firebaseConfig';
import { current } from 'immer';

interface VideoParams {
  videoIndex: string;
}

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

  const { videoIndex } = useParams<VideoParams>();
  const [criticalMoments, setCriticalMoments] = useState<{ [key: string]: any }>([]); // Define state as an array of strings

  const authContext = useAuth();
  if (!authContext) {
    // Handle the case where auth context is null. For example:
    return null; // or some other appropriate handling
  }
  const { loggedInUsername, setLoggedInUsername, userGroup, setUserGroup, isResearcher, setIsResearcher } = authContext;


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

  useEffect(() => {
    if (loggedInUsername) {
      const fetchMoments = async () => {
        const moments = await fetchCriticalMoments(loggedInUsername, Number(videoIndex));
        console.log(moments);
        setCriticalMoments(moments);
      };
      console.log("authContext: ", authContext);
      fetchMoments();
    }
  }, [loggedInUsername]);


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
            <h1>Critical Moments</h1>
            <ul>
              {criticalMoments.map((moment: any, index: any) => (
                <li key={index}>
                  <p>Time: {moment.time}</p>
                  <p>Comment: {moment.comment}</p>
                </li>
              ))}
            </ul>
            <span onClick={()=> console.log(loggedInUsername)}>hi</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default Home;
