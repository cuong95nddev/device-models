import { useRef, useState, useEffect, useMemo, Fragment, Suspense } from 'react';
import { render } from 'react-dom';
import classNames from 'classnames';
import { MathUtils } from 'three';
import ThemeProvider from 'components/ThemeProvider';
import { SwitchTransition, Transition } from 'react-transition-group';
import Tooltip from 'components/Tooltip';
import Model from 'components/Model';
import Spinner from 'components/Spinner';
import Dropdown from 'components/Dropdown';
import Input from 'components/Input';
import Button from 'components/Button';
import { useFormInput } from 'hooks';
import { getImage, getImageBlob } from 'utils/image';
import { reflow } from 'utils/transition';
import deviceModels from 'components/Model/deviceModels';
import presets from './presets';
import './index.css';

const devices = Object.values(deviceModels);
const [defaultDevice] = devices;

const Plugin = () => {
  const canvas = useRef();
  const [texture, setTexture] = useState(defaultDevice.texture);
  const [device, setDevice] = useState(defaultDevice.name);
  const [preset, setPreset] = useState(0);
  const { deviceRotation, cameraRotation } = presets[preset];
  const deviceX = useFormInput(deviceRotation.x);
  const deviceY = useFormInput(deviceRotation.y);
  const deviceZ = useFormInput(deviceRotation.z);
  const cameraX = useFormInput(cameraRotation.x);
  const cameraY = useFormInput(cameraRotation.y);
  const color = useFormInput('#FFFFFF');

  const modelSettings = useMemo(() => {
    const cameraRotation = {
      x: MathUtils.degToRad(cameraX.value),
      y: MathUtils.degToRad(cameraY.value),
      z: 0,
    };
    const deviceRotation = {
      x: MathUtils.degToRad(deviceX.value),
      y: MathUtils.degToRad(deviceY.value),
      z: MathUtils.degToRad(deviceZ.value),
    };

    return {
      cameraRotation,
      models: [
        {
          ...devices.find(({ name }) => name === device),
          rotation: deviceRotation,
          color: color.value,
          texture: {
            src: texture,
          },
        },
      ],
    };
  }, [
    cameraX.value,
    cameraY.value,
    deviceX.value,
    deviceY.value,
    deviceZ.value,
    device,
    color.value,
    texture,
  ]);

  useEffect(() => {
    window.onmessage = async event => {
      const selection = event.data.pluginMessage;
      if (!selection) return setTexture(defaultDevice.texture);

      const blob = new Blob([selection], { type: 'image/png' });

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => setTexture(reader.result);
    };
  }, []);

  useMemo(() => {
    const activeDevice = devices.find(({ name }) => name === device);

    if (devices.find(device => device.texture === texture)) {
      setTexture(activeDevice.texture);
    }
  }, [device, texture]);

  const createEmptyFrame = event => {
    event.preventDefault();
    event.stopPropagation();

    const { name, width, height } = devices.find(({ name }) => name === device);

    parent.postMessage(
      {
        pluginMessage: {
          type: 'create-empty-frame',
          name,
          width,
          height,
        },
      },
      '*'
    );
  };

  const saveCanvasImage = async event => {
    event.preventDefault();
    event.stopPropagation();

    const { name } = devices.find(({ name }) => name === device);
    const { width, height } = await getImage(canvas.current.toDataURL());
    const blob = getImageBlob(canvas.current.toDataURL());

    parent.postMessage(
      {
        pluginMessage: {
          type: 'save-canvas-image',
          name,
          width,
          height,
          blob,
        },
      },
      '*'
    );
  };

  const Preset = ({ index, label, children, ...rest }) => {
    const presetRef = useRef();
    const [isHovered, setIsHovered] = useState(false);

    const onClick = event => {
      event.preventDefault();
      event.stopPropagation();

      setPreset(index);
    };

    return (
      <Fragment>
        <button
          ref={presetRef}
          className="sidebar__device-button"
          aria-pressed={preset === index ? 'true' : 'false'}
          onMouseOver={() => setIsHovered(true)}
          onMouseOut={() => setIsHovered(false)}
          onClick={onClick}
          {...rest}
        >
          {children}
        </button>
        <Tooltip visible={isHovered} parent={presetRef}>
          {label}
        </Tooltip>
      </Fragment>
    );
  };

  return (
    <ThemeProvider inline>
      <main className="ui" tabIndex={-1}>
        <div className="ui__layout">
          <SwitchTransition
            mode="out-in"
            className="ui__viewport-wrapper"
            component="div"
          >
            <Transition
              appear
              timeout={{ enter: 400, exit: 200 }}
              key={device}
              onEnter={reflow}
            >
              {status => (
                <div className={classNames('ui__viewport', `ui__viewport--${status}`)}>
                  <Suspense fallback={<Spinner />}>
                    <Model ref={canvas} {...modelSettings} />
                  </Suspense>
                </div>
              )}
            </Transition>
          </SwitchTransition>
          <div className="sidebar">
            <div className="sidebar__control">
              <div className="sidebar__label">Device Model</div>
              <Dropdown
                options={devices.map(device => device.name)}
                onChange={device => setDevice(device)}
              />
            </div>
            <div className="sidebar__control">
              <div className="sidebar__label" id="anglePreset">
                Angle Preset
              </div>
              <div className="sidebar__devices" data-scroll="true">
                {presets.map(({ label }, index) => (
                  <Preset
                    key={index}
                    index={index}
                    label={label}
                    aria-describedby="anglePreset"
                  >
                    <img
                      className="sidebar__device-image"
                      alt={label}
                      src={devices.find(({ name }) => name === device).renders[index]}
                    />
                  </Preset>
                ))}
              </div>
            </div>
            <div className="sidebar__control">
              <div className="sidebar__label" id="deviceRotation">
                Device Rotation
              </div>
              <div className="sidebar__control-group">
                <Input
                  icon="rotateX"
                  label="Rotate X"
                  type="number"
                  aria-describedby="deviceRotation"
                  {...deviceX}
                />
                <Input
                  icon="rotateY"
                  label="Rotate Y"
                  type="number"
                  aria-describedby="deviceRotation"
                  {...deviceY}
                />
                <Input
                  icon="rotateZ"
                  label="Rotate Z"
                  type="number"
                  aria-describedby="deviceRotation"
                  {...deviceZ}
                />
              </div>
            </div>
            <div className="sidebar__control">
              <div className="sidebar__label" id="cameraRotation">
                Camera Rotation
              </div>
              <div className="sidebar__control-group">
                <Input
                  icon="rotateX"
                  label="Rotate X"
                  type="number"
                  aria-describedby="cameraRotation"
                  {...cameraX}
                />
                <Input
                  icon="rotateY"
                  label="Rotate Y"
                  type="number"
                  aria-describedby="cameraRotation"
                  {...cameraY}
                />
              </div>
            </div>
            <div className="sidebar__control">
              <div className="input">
                <label className="input__label" id="13-label" htmlFor="13-input">
                  Model Color
                </label>
                <div className="dropdown">
                  <button
                    aria-haspopup="true"
                    className="dropdown__button input__color-swatch"
                    id="dropdown-button-12"
                    aria-expanded="true"
                    aria-label="Choose color style"
                    style={{ backgroundColor: color.value }}
                  />
                </div>
                <input
                  className="input__element"
                  id="13-input"
                  aria-labelledby="13-label"
                  type="text"
                  {...color}
                />
              </div>
            </div>
            <div className="sidebar__actions">
              <Button onClick={createEmptyFrame}>Create Empty Frame</Button>
              <Button primary onClick={saveCanvasImage}>
                Save as Image
              </Button>
            </div>
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
};

render(<Plugin />, document.getElementById('root'));
