/* eslint-disable no-restricted-globals */
import React, { useState, useEffect } from 'react';
import { RouteComponentProps, useParams } from 'react-router-dom';
import './view-video.scss';
import { useAuth } from '../../authContext'; // Adjust the path as per your directory structure
import { fetchCriticalMoments } from '../../firebaseConfig';
import { current } from 'immer';
import { auth } from 'firebase-admin';

interface HomeProps extends RouteComponentProps {
  status: string;
  onLeaveOrJoinSession: () => void;
  createVideoToken: (topic: string, isResearcher: boolean) => any;
}

interface VideoParams {
  videoIndex: string;
}

const ViewVideo: React.FunctionComponent<HomeProps> = (props) => {
  const { history, status, onLeaveOrJoinSession, createVideoToken } = props;
  const { videoIndex } = useParams<VideoParams>();
  const [criticalMoments, setCriticalMoments] = useState<{ [key: string]: any }>([]); // Define state as an array of strings

  const authContext = useAuth();
  if (!authContext) {
    // Handle the case where auth context is null. For example:
    console.log("authContext: ", authContext);
    return null; // or some other appropriate handling
  }
  const { loggedInUsername, setLoggedInUsername, userGroup, setUserGroup, isResearcher, setIsResearcher } = authContext;

  useEffect(() => {
    const fetchMoments = async () => {
      const moments = await fetchCriticalMoments(loggedInUsername, Number(videoIndex));
      console.log(moments);
      setCriticalMoments(moments);
    };
    console.log("authContext: ", authContext);
    fetchMoments();
  }, [authContext?.loggedInUsername, videoIndex]);

  return (
    <div>
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
  );
};
export default ViewVideo;
