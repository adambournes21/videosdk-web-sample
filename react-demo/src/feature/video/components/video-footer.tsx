import { useState, useCallback, useContext, useEffect, MutableRefObject, useRef } from 'react';
import classNames from 'classnames';
import { message } from 'antd';
import ZoomContext from '../../../context/zoom-context';
import CameraButton from './camera';
import MicrophoneButton from './microphone';
import { ScreenShareButton } from './screen-share';
import AudioVideoStatisticModal from './audio-video-statistic';
import ZoomMediaContext from '../../../context/media-context';
import { useUnmount, useMount } from '../../../hooks';
import { MediaDevice } from '../video-types';
import './video-footer.scss';
import { isAndroidOrIOSBrowser, isIOSMobile } from '../../../utils/platform';
import { getPhoneCallStatusDescription, SELF_VIDEO_ID } from '../video-constants';
import { getRecordingButtons, RecordButtonProps, RecordingButton } from './recording';
import {
  DialoutState,
  RecordingStatus,
  MutedSource,
  AudioChangeAction,
  DialOutOption,
  VideoCapturingState,
  SharePrivilege,
  MobileVideoFacingMode,
  LiveStreamStatus,
  ShareStatus
} from '@zoom/videosdk';
import { LiveTranscriptionButton } from './live-transcription';
import { LeaveButton } from './leave';
import { TranscriptionSubtitle } from './transcription-subtitle';
import IsoRecordingModal from './recording-ask-modal';
import { LiveStreamButton, LiveStreamModal } from './live-stream';
import { IconFont } from '../../../component/icon-font';
import { VideoMaskModel } from './video-mask-modal';

import { RouteComponentProps } from 'react-router-dom';
import { updateUserGroup, haveUserLeaveRoom, fetchNextUserGroup, uploadVideo, storeVideoReference, createVideoReference, markCriticalMoment } from '../../../firebaseConfig';
import { useAuth } from '../../../authContext'; // Adjust the path as per your directory structure
import moment from 'moment-timezone';
import { useModal } from '../../../ModalContext';
import ChatModal from '../../../ChatModal';


interface VideoFooterProps extends RouteComponentProps {
  className?: string;
  selfShareCanvas?: HTMLCanvasElement | HTMLVideoElement | null;
  sharing?: boolean;
}

const isAudioEnable = typeof AudioWorklet === 'function';
const VideoFooter = (props: VideoFooterProps) => {

  const authContext = useAuth();
  if (!authContext) {
    // Handle the case where auth context is null. For example:
    return null; // or some other appropriate handling
  }
  const { loggedInUsername, setLoggedInUsername, userGroup, setUserGroup, isResearcher, setIsResearcher, researcher, setResearcher } = authContext;

  const { history, className, selfShareCanvas, sharing } = props;
  const zmClient = useContext(ZoomContext);
  const { mediaStream } = useContext(ZoomMediaContext);
  const liveTranscriptionClient = zmClient.getLiveTranscriptionClient();
  const liveStreamClient = zmClient.getLiveStreamClient();
  const recordingClient = zmClient.getRecordingClient();
  const [isStartedAudio, setIsStartedAudio] = useState(
    zmClient.getCurrentUserInfo() && zmClient.getCurrentUserInfo().audio !== ''
  );
  const [isStartedVideo, setIsStartedVideo] = useState(zmClient.getCurrentUserInfo()?.bVideoOn);
  const [audio, setAudio] = useState(zmClient.getCurrentUserInfo()?.audio);
  const [isSupportPhone, setIsSupportPhone] = useState(false);
  const [phoneCountryList, setPhoneCountryList] = useState<any[]>([]);
  const [phoneCallStatus, setPhoneCallStatus] = useState<DialoutState>();
  const [isStartedLiveTranscription, setIsStartedLiveTranscription] = useState(false);
  const [isDisableCaptions, setIsDisableCaptions] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isBlur, setIsBlur] = useState(false);
  const [isMuted, setIsMuted] = useState(!!zmClient.getCurrentUserInfo()?.muted);
  const [activeMicrophone, setActiveMicrophone] = useState(mediaStream?.getActiveMicrophone());
  const [activeSpeaker, setActiveSpeaker] = useState(mediaStream?.getActiveSpeaker());
  const [activeCamera, setActiveCamera] = useState(mediaStream?.getActiveCamera());
  const [micList, setMicList] = useState<MediaDevice[]>(mediaStream?.getMicList() ?? []);
  const [speakerList, setSpeakerList] = useState<MediaDevice[]>(mediaStream?.getSpeakerList() ?? []);
  const [cameraList, setCameraList] = useState<MediaDevice[]>(mediaStream?.getCameraList() ?? []);
  const [statisticVisible, setStatisticVisible] = useState(false);
  const [selecetedStatisticTab, setSelectedStatisticTab] = useState('audio');
  const [isComputerAudioDisabled, setIsComputerAudioDisabled] = useState(false);
  const [sharePrivilege, setSharePrivileg] = useState(SharePrivilege.Unlocked);
  const [caption, setCaption] = useState({ text: '', isOver: false });
  const [activePlaybackUrl, setActivePlaybackUrl] = useState('');
  const [isMicrophoneForbidden, setIsMicrophoneForbidden] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'' | RecordingStatus>(
    recordingClient?.getCloudRecordingStatus() || ''
  );
  const [recordingIsoStatus, setRecordingIsoStatus] = useState<'' | RecordingStatus>('');
  const [liveStreamVisible, setLiveStreamVisible] = useState(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState(liveStreamClient?.getLiveStreamStatus());
  // Video Mask
  const [videoMaskVisible, setVideoMaskVisible] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const { modalStates, setModalState } = useModal();

  const handleChatButtonClick = () => {
    setModalState('chatModal', !modalStates.chatModal);
  };


  const onCameraClick = useCallback(async () => {
    if (isStartedVideo) {
      await mediaStream?.stopVideo();
      setIsStartedVideo(false);
    } else {
      const temporaryException = isIOSMobile() && window.crossOriginIsolated; // add ios mobile exception for test backward compatible.
      if (mediaStream?.isRenderSelfViewWithVideoElement() && !temporaryException) {
        const videoElement = document.querySelector(`#${SELF_VIDEO_ID}`) as HTMLVideoElement;
        if (videoElement) {
          await mediaStream?.startVideo({ videoElement });
        }
      } else {
        const startVideoOptions = { hd: true, ptz: mediaStream?.isBrowserSupportPTZ() };
        if (mediaStream?.isSupportVirtualBackground() && isBlur) {
          Object.assign(startVideoOptions, { virtualBackground: { imageUrl: 'blur' } });
        }
        await mediaStream?.startVideo(startVideoOptions);
        if (!mediaStream?.isSupportMultipleVideos()) {
          const canvasElement = document.querySelector(`#${SELF_VIDEO_ID}`) as HTMLCanvasElement;
          mediaStream?.renderVideo(
            canvasElement,
            zmClient.getSessionInfo().userId,
            canvasElement.width,
            canvasElement.height,
            0,
            0,
            3
          );
        }
      }

      setIsStartedVideo(true);
    }
  }, [mediaStream, isStartedVideo, zmClient, isBlur]);

  const onMicrophoneClick = useCallback(async () => {
    if (isStartedAudio) {
      if (isMuted) {
        await mediaStream?.unmuteAudio();
      } else {
        await mediaStream?.muteAudio();
      }
    } else {
      try {
        await mediaStream?.startAudio();
      } catch (e: any) {
        if (e.type === 'INSUFFICIENT_PRIVILEGES' && e.reason === 'USER_FORBIDDEN_MICROPHONE') {
          setIsMicrophoneForbidden(true);
        }
        console.warn(e);
      }
      setIsStartedAudio(true);
    }
  }, [mediaStream, isStartedAudio, isMuted]);

  const onMicrophoneMenuClick = async (key: string) => {
    if (mediaStream) {
      const [type, deviceId] = key.split('|');
      if (type === 'microphone') {
        if (deviceId !== activeMicrophone) {
          await mediaStream.switchMicrophone(deviceId);
          setActiveMicrophone(mediaStream.getActiveMicrophone());
        }
      } else if (type === 'speaker') {
        if (deviceId !== activeSpeaker) {
          await mediaStream.switchSpeaker(deviceId);
          setActiveSpeaker(mediaStream.getActiveSpeaker());
        }
      } else if (type === 'leave audio') {
        if (audio === 'computer') {
          await mediaStream.stopAudio();
        } else if (audio === 'phone') {
          await mediaStream.hangup();
          setPhoneCallStatus(undefined);
        }
        setIsStartedAudio(false);
      } else if (type === 'statistic') {
        setSelectedStatisticTab('audio');
        setStatisticVisible(true);
      }
    }
  };

  const onSwitchCamera = async (key: string) => {
    if (mediaStream) {
      if (activeCamera !== key) {
        await mediaStream.switchCamera(key);
        setActiveCamera(mediaStream.getActiveCamera());
        setActivePlaybackUrl('');
      }
    }
  };

  const onMirrorVideo = async () => {
    await mediaStream?.mirrorVideo(!isMirrored);
    setIsMirrored(!isMirrored);
  };

  const onBlurBackground = async () => {
    const isSupportVirtualBackground = mediaStream?.isSupportVirtualBackground();
    if (isSupportVirtualBackground) {
      if (isBlur) {
        await mediaStream?.updateVirtualBackgroundImage(undefined);
      } else {
        await mediaStream?.updateVirtualBackgroundImage('blur');
      }
    } else {
      setVideoMaskVisible(true);
    }
    setIsBlur(!isBlur);
  };

  const onPhoneCall = async (code: string, phoneNumber: string, name: string, option: DialOutOption) => {
    await mediaStream?.inviteByPhone(code, phoneNumber, name, option);
  };

  const onPhoneCallCancel = async (code: string, phoneNumber: string, option: { callMe: boolean }) => {
    if ([DialoutState.Calling, DialoutState.Ringing, DialoutState.Accepted].includes(phoneCallStatus as any)) {
      await mediaStream?.cancelInviteByPhone(code, phoneNumber, option);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 3000);
      });
    }
    return Promise.resolve();
  };

  const onHostAudioMuted = useCallback((payload) => {
    const { action, source, type } = payload;
    if (action === AudioChangeAction.Join) {
      setIsStartedAudio(true);
      setAudio(type);
    } else if (action === AudioChangeAction.Leave) {
      setIsStartedAudio(false);
    } else if (action === AudioChangeAction.Muted) {
      setIsMuted(true);
      if (source === MutedSource.PassiveByMuteOne) {
        message.info('Host muted you');
      }
    } else if (action === AudioChangeAction.Unmuted) {
      setIsMuted(false);
      if (source === 'passive') {
        message.info('Host unmuted you');
      }
    }
  }, []);
  
  const onScreenShareClick = useCallback(async () => {
    if (mediaStream?.getShareStatus() === ShareStatus.End && selfShareCanvas) {
      await mediaStream?.startShareScreen(selfShareCanvas, { requestReadReceipt: true });
    }
  }, [mediaStream, selfShareCanvas]);

  const onLiveTranscriptionClick = useCallback(async () => {
    if (isDisableCaptions) {
      message.info('Captions has been disable by host.');
    } else if (isStartedLiveTranscription) {
      message.info('Live transcription has started.');
    } else if (!isStartedLiveTranscription) {
      await liveTranscriptionClient?.startLiveTranscription();
      setIsStartedLiveTranscription(true);
    }
  }, [isStartedLiveTranscription, isDisableCaptions, liveTranscriptionClient]);

  const onDisableCaptions = useCallback(
    async (disable: boolean) => {
      if (disable && !isDisableCaptions) {
        await liveTranscriptionClient?.disableCaptions(disable);
        setIsStartedLiveTranscription(false);
        setIsDisableCaptions(true);
      } else if (!disable && isDisableCaptions) {
        await liveTranscriptionClient?.disableCaptions(disable);
        setIsDisableCaptions(false);
      }
    },
    [isDisableCaptions, liveTranscriptionClient]
  );

  const onLeaveClick = useCallback(async () => {
    console.log("this is leaveClick: loggedInUsername: ", loggedInUsername);
    haveUserLeaveRoom(loggedInUsername, userGroup);
    if (loggedInUsername != 'r') {
      fetchNextUserGroup(loggedInUsername).then((result) => {
        if (result.success && result.nextUserGroup) {
          setUserGroup(result.nextUserGroup);
        } else {
          console.error(result.message || 'Failed to fetch next user group.');
        }
      });
    }
    await zmClient.leave();
    updateUserGroup(loggedInUsername);
    if (userGroup) {
      history.push('new-home'); //set to waiting-room
    } else {
      history.push('r')
    }
  }, [zmClient]);

  const onEndClick = useCallback(async () => {
    console.log("this is endClick: loggedInUsername: ", loggedInUsername);
    await zmClient.leave(true);
    fetchNextUserGroup(loggedInUsername).then((result) => {
      if (result.success && result.nextUserGroup) {
        setUserGroup(result.nextUserGroup);
      } else {
        console.error(result.message || 'Failed to fetch next user group.');
      }
    });
    updateUserGroup(loggedInUsername);
    haveUserLeaveRoom(loggedInUsername, userGroup);
    if (userGroup) {
      history.push('new-home'); //set to waiting-room
    } else {
      history.push('r');
    }
  }, [zmClient]);

  const onPassivelyStopShare = useCallback(({ reason }) => {
    console.log('passively stop reason:', reason);
  }, []);

  const onDeviceChange = useCallback(() => {
    if (mediaStream) {
      setMicList(mediaStream.getMicList());
      setSpeakerList(mediaStream.getSpeakerList());
      if (!isAndroidOrIOSBrowser()) {
        setCameraList(mediaStream.getCameraList());
      }
      setActiveMicrophone(mediaStream.getActiveMicrophone());
      setActiveSpeaker(mediaStream.getActiveSpeaker());
      setActiveCamera(mediaStream.getActiveCamera());
    }
  }, [mediaStream]);

  const onRecordingChange = useCallback(() => {
    setRecordingStatus(recordingClient?.getCloudRecordingStatus() || '');
  }, [recordingClient]);

  const onRecordingISOChange = useCallback(
    (payload: any) => {
      if (payload?.userId === zmClient.getSessionInfo().userId || payload?.status === RecordingStatus.Ask) {
        setRecordingIsoStatus(payload?.status);
      }
      console.log('recording-iso-change', payload);
    },
    [zmClient]
  );

  const onDialOutChange = useCallback((payload) => {
    setPhoneCallStatus(payload.code);
  }, []);

  const onRecordingClick = async (key: string) => {
    console.log(key);
    switch (key) {
      case 'Record': {
        await recordingClient?.startCloudRecording();
        console.log("Record Clicked");
        break;
      }
      case 'Resume': {
        await recordingClient?.resumeCloudRecording();
        console.log("Resume Clicked");
        break;
      }
      case 'Stop': {
        await recordingClient?.stopCloudRecording();
        console.log("Stop Clicked");
        break;
      }
      case 'Pause': {
        await recordingClient?.pauseCloudRecording();
        console.log("Pause Clicked");
        break;
      }
      case 'Status': {
        console.log("Status Clicked");
        break;
      }
      default: {
        await recordingClient?.startCloudRecording();
      }
    }
  };

  // Function to start screen recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = handleStopRecording;
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      const callStartTime = moment().tz('America/New_York').format();
      await createVideoReference(loggedInUsername, { title: 'Screen Recording' }, callStartTime);
      console.log('Recording uploaded successfully');    } catch (error) {
      console.error('Error starting screen recording:', error);
    }
  };

  // Function to stop screen recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  // Function to handle recording stop
  const handleStopRecording = async () => {
    const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const videoFile = new File([videoBlob], 'screen-recording.webm', { type: 'video/webm' });

    // Upload video file to Firebase
    try {
      const videoPath = await uploadVideo(videoFile);
      await storeVideoReference(loggedInUsername, videoPath);
    } catch (error) {
      console.error('Error uploading recording:', error);
    }
  };

  //Function to markCriticalMoments
  const handleMarkCriticalMoment = async () => {
    try {
      await markCriticalMoment(loggedInUsername, "comment", researcher)
    } catch (error) {
      console.error('Error marking critical moment:', error);
    }
  }

    const onVideoCaptureChange = useCallback((payload) => {
      if (payload.state === VideoCapturingState.Started) {
        setIsStartedVideo(true);
      } else {
        setIsStartedVideo(false);
      }
    }, []);
    const onShareAudioChange = useCallback(
      (payload) => {
        const { state } = payload;
        if (state === 'on') {
          if (!mediaStream?.isSupportMicrophoneAndShareAudioSimultaneously()) {
            setIsComputerAudioDisabled(true);
          }
        } else if (state === 'off') {
          setIsComputerAudioDisabled(false);
        }
      },
      [mediaStream]
    );
    const onHostAskToUnmute = useCallback((payload) => {
      const { reason } = payload;
      console.log(`Host ask to unmute the audio.`, reason);
    }, []);

  const onCaptionStatusChange = useCallback((payload) => {
    const { autoCaption } = payload;
    if (autoCaption) {
      message.info('Auto live transcription enabled!');
    }
  }, []);

  const onCaptionMessage = useCallback((payload) => {
    const { text, done } = payload;
    setCaption({
      text,
      isOver: done
    });
  }, []);

  const onCaptionDisable = useCallback((payload) => {
    setIsDisableCaptions(payload);
    if (payload) {
      setIsStartedLiveTranscription(false);
    }
  }, []);

  const onCanSeeMyScreen = useCallback(() => {
    message.info('Users can now see your screen', 1);
  }, []);
  const onSelectVideoPlayback = useCallback(
    async (url: string) => {
      if (activePlaybackUrl !== url) {
        await mediaStream?.switchCamera({ url, loop: true });
        if (isStartedAudio) {
          await mediaStream?.switchMicrophone({ url, loop: true });
        } else {
          await mediaStream?.startAudio({ mediaFile: { url, loop: true } });
        }
        setActivePlaybackUrl(url);
      }
    },
    [isStartedAudio, activePlaybackUrl, mediaStream]
  );

  const onLiveStreamClick = useCallback(() => {
    if (liveStreamStatus === LiveStreamStatus.Ended) {
      setLiveStreamVisible(true);
    } else if (liveStreamStatus === LiveStreamStatus.InProgress) {
      liveStreamClient?.stopLiveStream();
    }
  }, [liveStreamStatus, liveStreamClient]);
  const onLiveStreamStatusChange = useCallback((status) => {
    setLiveStreamStatus(status);
    if (status === LiveStreamStatus.Timeout) {
      message.error('Start live streaming timeout');
    }
  }, []);


  useEffect(() => {
    zmClient.on('current-audio-change', onHostAudioMuted);
    zmClient.on('passively-stop-share', onPassivelyStopShare);
    zmClient.on('device-change', onDeviceChange);
    zmClient.on('recording-change', onRecordingChange);
    zmClient.on('individual-recording-change', onRecordingISOChange);
    zmClient.on('dialout-state-change', onDialOutChange);
    zmClient.on('video-capturing-change', onVideoCaptureChange);
    zmClient.on('share-audio-change', onShareAudioChange);
    zmClient.on('host-ask-unmute-audio', onHostAskToUnmute);
    zmClient.on('caption-status', onCaptionStatusChange);
    zmClient.on('caption-message', onCaptionMessage);
    zmClient.on('caption-host-disable', onCaptionDisable);
    zmClient.on('share-can-see-screen', onCanSeeMyScreen);
    zmClient.on('live-stream-status', onLiveStreamStatusChange);
    return () => {
      zmClient.off('current-audio-change', onHostAudioMuted);
      zmClient.off('passively-stop-share', onPassivelyStopShare);
      zmClient.off('device-change', onDeviceChange);
      zmClient.off('recording-change', onRecordingChange);
      zmClient.off('individual-recording-change', onRecordingISOChange);
      zmClient.off('dialout-state-change', onDialOutChange);
      zmClient.off('video-capturing-change', onVideoCaptureChange);
      zmClient.off('share-audio-change', onShareAudioChange);
      zmClient.off('host-ask-unmute-audio', onHostAskToUnmute);
      zmClient.off('caption-status', onCaptionStatusChange);
      zmClient.off('caption-message', onCaptionMessage);
      zmClient.off('caption-host-disable', onCaptionDisable);
      zmClient.off('share-can-see-screen', onCanSeeMyScreen);
      zmClient.off('live-stream-status', onLiveStreamStatusChange);
    };
  }, [
    zmClient,
    onHostAudioMuted,
    onPassivelyStopShare,
    onDeviceChange,
    onRecordingChange,
    onDialOutChange,
    onVideoCaptureChange,
    onShareAudioChange,
    onHostAskToUnmute,
    onCaptionStatusChange,
    onCaptionMessage,
    onCanSeeMyScreen,
    onRecordingISOChange,
    onCaptionDisable,
    onLiveStreamStatusChange
  ]);
  useUnmount(() => {
    if (isStartedAudio) {
      mediaStream?.stopAudio();
    }
    if (isStartedVideo) {
      mediaStream?.stopVideo();
    }
    mediaStream?.stopShareScreen();
  });
  useMount(() => {
    if (mediaStream) {
      setIsSupportPhone(!!mediaStream.isSupportPhoneFeature());
      setPhoneCountryList(mediaStream.getSupportCountryInfo() || []);
      setSharePrivileg(mediaStream.getSharePrivilege());
      if (isAndroidOrIOSBrowser()) {
        setCameraList([
          { deviceId: MobileVideoFacingMode.User, label: 'Front-facing' },
          { deviceId: MobileVideoFacingMode.Environment, label: 'Rear-facing' }
        ]);
      }
    }
  });
  useEffect(() => {
    if (mediaStream && zmClient.getSessionInfo().isInMeeting) {
      mediaStream.subscribeAudioStatisticData();
      mediaStream.subscribeVideoStatisticData();
      mediaStream.subscribeShareStatisticData();
    }
    return () => {
      if (zmClient.getSessionInfo().isInMeeting) {
        mediaStream?.unsubscribeAudioStatisticData();
        mediaStream?.unsubscribeVideoStatisticData();
        mediaStream?.unsubscribeShareStatisticData();
      }
    };
  }, [mediaStream, zmClient]);
  const recordingButtons: RecordButtonProps[] = getRecordingButtons(recordingStatus, zmClient.isHost());
  return (
    <div className={classNames('video-footer', className)}>
      {isAudioEnable && (
        <MicrophoneButton
          isStartedAudio={isStartedAudio}
          isMuted={isMuted}
          isSupportPhone={isSupportPhone}
          audio={audio}
          phoneCountryList={phoneCountryList}
          onPhoneCallClick={onPhoneCall}
          onPhoneCallCancel={onPhoneCallCancel}
          phoneCallStatus={getPhoneCallStatusDescription(phoneCallStatus)}
          onMicrophoneClick={onMicrophoneClick}
          onMicrophoneMenuClick={onMicrophoneMenuClick}
          microphoneList={micList}
          speakerList={speakerList}
          activeMicrophone={activeMicrophone}
          activeSpeaker={activeSpeaker}
          disabled={isComputerAudioDisabled}
          isMicrophoneForbidden={isMicrophoneForbidden}
        />
      )}
      <CameraButton
        isStartedVideo={isStartedVideo}
        onCameraClick={onCameraClick}
        onSwitchCamera={onSwitchCamera}
        onMirrorVideo={onMirrorVideo}
        onVideoStatistic={() => {
          setSelectedStatisticTab('video');
          setStatisticVisible(true);
        }}
        onBlurBackground={onBlurBackground}
        onSelectVideoPlayback={onSelectVideoPlayback}
        activePlaybackUrl={activePlaybackUrl}
        cameraList={cameraList}
        activeCamera={activeCamera}
        isMirrored={isMirrored}
        isBlur={isBlur}
      />
      {sharing && (
        <ScreenShareButton
          sharePrivilege={sharePrivilege}
          isHostOrManager={zmClient.isHost() || zmClient.isManager()}
          onScreenShareClick={onScreenShareClick}
          onSharePrivilegeClick={async (privilege) => {
            await mediaStream?.setSharePrivilege(privilege);
            setSharePrivileg(privilege);
          }}
        />
      )}

      {recordingButtons.map((button: RecordButtonProps) => {
        return (
          <RecordingButton
            key={button.text}
            onClick={() => {
              onRecordingClick(button.text);
            }}
            {...button}
          />
        );
      })}

      {/* added this */}
      {/* <RecordingButton
        key="hi"
        onClick={() => {
          onNewRecordingClick();
        }}
        {...recordingButtons[0]} */}

      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      <button onClick={handleMarkCriticalMoment}>
        Mark Critical Moment
      </button>

      <button onClick={handleChatButtonClick}>Toggle Chat Modal</button>
      <ChatModal />
      
      {liveTranscriptionClient?.getLiveTranscriptionStatus().isLiveTranscriptionEnabled && (
        <>
          <LiveTranscriptionButton
            isStartedLiveTranscription={isStartedLiveTranscription}
            isDisableCaptions={isDisableCaptions}
            isHost={zmClient.isHost()}
            onDisableCaptions={onDisableCaptions}
            onLiveTranscriptionClick={onLiveTranscriptionClick}
          />
          <TranscriptionSubtitle text={caption.text} />
        </>
      )}
      {/* {liveStreamClient?.isLiveStreamEnabled() && zmClient.isHost() && (
        <>
          <LiveStreamButton
            isLiveStreamOn={liveStreamStatus === LiveStreamStatus.InProgress}
            onLiveStreamClick={onLiveStreamClick}
          />
          <LiveStreamModal
            visible={liveStreamVisible}
            setVisible={setLiveStreamVisible}
            onStartLiveStream={(streanUrl: string, streamKey: string, broadcastUrl: string) => {
              liveStreamClient.startLiveStream(streanUrl, streamKey, broadcastUrl);
            }}
          />
        </>
      )} */}
      {liveStreamStatus === LiveStreamStatus.InProgress && (
        <IconFont type="icon-live" style={{ position: 'fixed', top: '45px', left: '10px', color: '#f00' }} />
      )}
      <LeaveButton {...props} onLeaveClick={onLeaveClick} isHost={zmClient.isHost()} onEndClick={onEndClick} />

      <AudioVideoStatisticModal
        visible={statisticVisible}
        setVisible={setStatisticVisible}
        defaultTab={selecetedStatisticTab}
        isStartedAudio={isStartedAudio}
        isMuted={isMuted}
        isStartedVideo={isStartedVideo}
      />

      {recordingIsoStatus === RecordingStatus.Ask && (
        <IsoRecordingModal
          onClick={() => {
            recordingClient?.acceptIndividualRecording();
          }}
          onCancel={() => {
            recordingClient?.declineIndividualRecording();
          }}
        />
      )}
      {!mediaStream?.isSupportVirtualBackground() && (
        <VideoMaskModel visible={videoMaskVisible} setVisible={setVideoMaskVisible} isMirrored={isMirrored} />
      )}
    </div>
  );
};
export default VideoFooter;
