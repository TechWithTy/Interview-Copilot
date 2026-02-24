import {FC} from 'react';
import browser from 'webextension-polyfill';
import styles from './Popup.module.scss';

const Popup: FC = () => {
  const openRecorder = async () => {
    await browser.tabs.create({ url: browser.runtime.getURL('Options/options.html') });
  };

  return (
    <section className={styles.popup} style={{ padding: '20px', textAlign: 'center' }}>
      <header className={styles.header}>
        <h1 className={styles.title}>Audio Recorder</h1>
        <p>Record browser tab and microphone audio</p>
      </header>
      <button 
        onClick={openRecorder}
        style={{
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '20px',
          fontSize: '16px'
        }}
      >
        Open Recorder Dashboard
      </button>
    </section>
  );
};

export default Popup;
