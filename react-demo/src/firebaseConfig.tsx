// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, getDoc, updateDoc, arrayRemove, arrayUnion, addDoc, query, onSnapshot, orderBy } from "firebase/firestore";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import moment from 'moment-timezone';

// otherFile.js
import firebaseConfig from './firebaseSecret';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export const checkLoginCredentials = async (username: string, password: string) => {
  try {
      const userDocRef = doc(firestore, `Users/${username}`);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.password === password) {
          return { valid: true, group: userData.group, researcher: userData.researcher };
        }
      }
      return { valid: false };
    } catch (error) {
      console.error('Error checking login credentials:', error);
      return { valid: false };
    }
  };

  export const updateUserGroup = async (username: string | null) => {
    try {
      const userDocRef = doc(firestore, `Users/${username}`);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.nextGroup) {
          await updateDoc(userDocRef, {
            group: userData.nextGroup
          });
          return { success: true, message: "User group updated successfully." };
        } else {
          return { success: false, message: "Next group field is empty." };
        }
      } else {
        return { success: false, message: "User not found." };
      }
    } catch (error) {
      // Check if error is an instance of Error
      if (error instanceof Error) {
        console.error('Error updating user group:', error);
        return { success: false, message: error.message };
      } else {
        // Handle the case where the error is not an Error instance
        console.error('An unknown error occurred:', error);
        return { success: false, message: 'An unknown error occurred' };
      }
    }
  };

  export const fetchNextUserGroup = async (username: string | null) => {
    try {
      // Reference to the specific user document
      const userDocRef = doc(firestore, `Users/${username}`);
      
      // Fetch the document
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        // Get the data from the document
        const userData = userDoc.data();
        
        // Check if nextGroup field exists
        if ('nextGroup' in userData) {
          return { success: true, nextUserGroup: userData.nextGroup };
        } else {
          throw new Error('nextGroup field does not exist for this user');
        }
      } else {
        throw new Error(`User document for ${username} does not exist`);
      }
    } catch (error) {
      console.error("Error fetching next user group:", error);
      return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred" };
    }
  };

  export interface FetchCurrentMeetingsResponse {
    success: boolean;
    meetings?: { [key: string]: any }[]; // Array of objects with document ID as key
    message?: string;
  }

export const fetchCurrentMeetings = async (): Promise<FetchCurrentMeetingsResponse> => {
  try {
      const meetingsCollectionRef = collection(firestore, "currentMeetings");
      const querySnapshot = await getDocs(meetingsCollectionRef);
      const meetings = querySnapshot.docs.map(doc => {
          return { [doc.id]: doc.data() }; // Map each document to an object
      });
      return { success: true, meetings };
  } catch (error) {
      console.error("Error fetching current meetings:", error);
      return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred" };
  }
};

export const haveUserLeaveRoom = async (username: string | null, group: string) => {
  try {
      // Reference to the specific group document
      const groupDocRef = doc(firestore, `currentMeetings/${group}`);

      // Remove the user from the users array in the group document
      await updateDoc(groupDocRef, {
          users: arrayRemove(username)
      });

      console.log(`User ${username} removed from group ${group}`);
      return { success: true, message: `User ${username} removed from group ${group}` };
  } catch (error) {
      console.error("Error removing user from group:", error);
      return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred" };
  }
};


export const haveUserJoinRoom = async (username : string | null, group: string) => {
  try {
      // Reference to the specific group document
      const groupDocRef = doc(firestore, `currentMeetings/${group}`);

      // Add the user to the users array in the group document
      await updateDoc(groupDocRef, {
          users: arrayUnion(username)
      });

      console.log(`User ${username} added to group ${group}`);
      return { success: true, message: `User ${username} added to group ${group}` };
  } catch (error) {
      console.error("Error adding user to group:", error);
      return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred" };
  }
};


export const createVideoReference = async (userId: any, videoMetadata: any, startTime: any) => {
  try {
    const videoRef = doc(firestore, `videos/${userId}`);
    await setDoc(videoRef, {
      videoArray: arrayUnion({
        metadata: videoMetadata,
        startTime: startTime,
        criticalMoments: []
      })
    }, { merge: true }); // Merge ensures that existing data in the document is not overwritten
    console.log('Video reference updated in Firestore.');
  } catch (error) {
    console.error('Error updating video reference:', error);
  }
};


export const storeVideoReference = async (userId: any, videoPath: any) => {
  try {
    const videoRef = doc(firestore, `videos/${userId}`);
    const videoDoc = await getDoc(videoRef);

    if (videoDoc.exists()) {
      let videoArray = videoDoc.data().videoArray || [];
      // Identify the correct video in the array to update
      // For example, find the video by its startTime or metadata

      // let videoIndex = videoArray.findIndex(v => -1);
      let videoIndex = videoArray.length - 1;
      if (videoIndex !== -1) {
        videoArray[videoIndex].path = videoPath;
        await updateDoc(videoRef, { videoArray });
      }
    }
    console.log('Video path updated in Firestore.');
  } catch (error) {
    console.error('Error updating video path:', error);
  }
};


export const uploadVideo = async (file: any) => {
  const storage = getStorage();
  const storageRef = ref(storage, `videos/${file.name}`);

  try {
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading video:", error);
    throw error; // Rethrow the error for handling in the component
  }
};

export const markCriticalMoment = async (username: any, comment: any, researcher: any) => {
  try {
    const videoRef = doc(firestore, `videos/${researcher}`);
    const videoDoc = await getDoc(videoRef);

    if (videoDoc.exists()) {
      let videoArray = videoDoc.data().videoArray || [];
      let videoIndex = videoArray.length - 1; // Assuming each video has a unique ID

      if (videoIndex !== -1) {
        const video = videoArray[videoIndex];
        const startTime = moment(video.startTime);
        // Convert time to Moment object if it's not already
        const callStartTime = moment().tz('America/New_York');
        // Calculate the time offset in milliseconds (or in any other unit you prefer)
        const timeOffset = callStartTime.diff(startTime);

        // Add the new critical moment
        video.criticalMoments.push({
          username: username,
          time: timeOffset, // Use the calculated time offset
          comment: comment
        });

        // Update the document
        await updateDoc(videoRef, { videoArray });
        console.log('Critical moment added successfully.');
      } else {
        console.log('Video not found.');
      }
    } else {
      console.log('No document found for this username.');
    }
  } catch (error) {
    console.error('Error marking critical moment:', error);
  }
};


export interface VideoDetail {
  index: number;
  path: string;
  startTime: number; // or Date, depending on how you store it
}


export const fetchPathsAndTimes = async (username: string): Promise<VideoDetail[]> => {
  try {
    const videoRef = doc(firestore, `videos/${username}`);
    const videoDoc = await getDoc(videoRef);

    if (videoDoc.exists()) {
      const videoData = videoDoc.data();
      return videoData.videoArray.map((video: any, index: number) => ({
        index: index,
        path: video.path,
        startTime: video.startTime
      }));
    } else {
      console.log('No videos found for this user.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching paths and times:', error);
    return [];
  }
};

interface CriticalMoment {
  time: number; // or Date, depending on how you store it
  comment: string;
}

export const fetchCriticalMoments = async (username: string | null, videoIndex: number): Promise<CriticalMoment[]> => {
  try {
    const videoRef = doc(firestore, `videos/${username}`);
    const videoDoc = await getDoc(videoRef);
    console.log(username, videoIndex)

    if (videoDoc.exists()) {
      const videoData = videoDoc.data();
      const video = videoData.videoArray[videoIndex];
      if (video && video.criticalMoments) {
        return video.criticalMoments as CriticalMoment[];
      }
      return [];
    } else {
      console.log('No videos found for this user.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching critical moments:', error);
    return [];
  }
};


export const addChatMessage = async (userGroup: string, message: string, username: string) => {
  const meetingDocRef = doc(firestore, `currentMeetings/${userGroup}`);
  try {
    // Update the 'chats' array in the document
    await updateDoc(meetingDocRef, {
      chats: arrayUnion({
        text: message,
        user: username,
        timestamp: new Date().toISOString(),
        isSent: true,
      }),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};


// Function to fetch chat messages from an array in a Firestore document
export const onChatMessagesSnapshot = (userGroup: string, callback: Function) => {
  const meetingDocRef = doc(firestore, `currentMeetings/${userGroup}`);
  return onSnapshot(meetingDocRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      const messages = data.chats || [];
      callback(messages);
    } else {
      console.log('No chat document found for the user group:', userGroup);
    }
  });
};
