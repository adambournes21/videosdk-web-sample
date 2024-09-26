import React from 'react';
import { Button, Tooltip, Dropdown, Menu } from 'antd';
import classNames from 'classnames';
import { UpOutlined } from '@ant-design/icons';
import { IconFont } from '../../../component/icon-font';
import { getAntdDropdownMenu, getAntdItem } from './video-footer-utils';

import { RouteComponentProps } from 'react-router-dom';
import { useAuth } from '../../../authContext'; // Adjust the path as per your directory structure

const { Button: DropdownButton } = Dropdown;
const { Item: MenuItem } = Menu;

interface LeaveButtonProps extends RouteComponentProps{
  onLeaveClick: () => void;
  onEndClick: () => void;
  isHost: boolean;
}

const LeaveButton = (props: LeaveButtonProps) => {

  const authContext = useAuth();
  if (!authContext) {
    // Handle the case where auth context is null. For example:
    return null; // or some other appropriate handling
  }
  const { loggedInUsername, setLoggedInUsername, userGroup, setUserGroup, isResearcher, setIsResearcher } = authContext;


  const { history, onLeaveClick, onEndClick, isHost } = props;

  return isResearcher ? (
    <Tooltip title={`end call`}>
      <DropdownButton
        className="vc-dropdown-button"
        size="large"
        menu={getAntdDropdownMenu([getAntdItem('End session', 'end')], onEndClick)}
        trigger={['click']}
        type="ghost"
        onClick={onEndClick}
        icon={<UpOutlined />}
        placement="topRight"
      >
        <IconFont type="icon-leave" />
      </DropdownButton>
    </Tooltip>
  ) : (
    <Tooltip title={`leave call`}>
      <Button
        className={classNames('vc-button')}
        icon={<IconFont type="icon-leave" />}
        // eslint-disable-next-line react/jsx-boolean-value
        ghost={true}
        shape="circle"
        size="large"
        onClick={onLeaveClick}
        title="Leave session"
      />
    </Tooltip>
  );
};

export { LeaveButton };
