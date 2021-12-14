import * as React from 'react';
import { useDispatch } from 'react-redux';
import { AppContainer, MainMaxWidthContainer } from '../components/Util';
import { TitleBar } from '../components/TitleBar';
import { openLanding } from '../state/nav';
import * as fs from 'fs';
import JSZip from 'jszip';
import { useState } from 'react';
import { ipcRenderer } from 'electron';
import styled from 'styled-components';
import pf_funding_svg from '../../../doc/pf_funding_logos.svg';
import { Button, Link } from 'evergreen-ui';

const CenteredH1 = styled.h1`
  margin: 1rem auto;
  width: 100%;
  text-align: center;
`;

const AboutPageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`;

function openLicenses() {
  const data = fs.readFileSync('generated/licenses.zip');
  JSZip.loadAsync(data).then((zip) =>
    zip
      .file('licenses.txt')
      ?.async('text')
      .then((x) => {
        ipcRenderer.invoke('open-text-in-system', {
          name: 'licenses.txt',
          text: x,
        });
      })
  );
}

export function AboutPage(): JSX.Element {
  const dispatch = useDispatch();
  const [aboutData, setAboutData] = useState({ version: 'n/a' });

  ipcRenderer.invoke('get-about').then((x) => setAboutData(x));

  return (
    <AppContainer>
      <TitleBar />
      <MainMaxWidthContainer>
        <CenteredH1>About audapolis</CenteredH1>
        <AboutPageContainer>
          <p>Version: {aboutData.version}</p>
          <p>
            Audapolis would not be possible without a large number of open source components. A list
            of all used components and their license can be found{' '}
            <Link onClick={openLicenses}>here: Open Acknowledgements</Link>
          </p>
          <p>
            Audapolis is founded from September 2021 until February 2022 by
            <img
              src={pf_funding_svg}
              alt='logos of the "Bundesministerium für Bildung und Forschung", Prodotype Fund and OKFN-Deutschland'
            />
          </p>
          <Button
            onClick={() => dispatch(openLanding())}
            style={{ position: 'absolute', bottom: '1em' }}
          >
            Home
          </Button>
        </AboutPageContainer>
      </MainMaxWidthContainer>
    </AppContainer>
  );
}
