import styled from 'styled-components';

export const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:focus {
    outline: none;
  }
`;

export const MainCenterColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`;

export const MainMaxWidthContainer = styled.div`
  width: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  & > * {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }
`;

export const Title = styled.h1`
  text-align: left;
  font-weight: normal;
  font-size: 20px;
  grid-column-start: 2;
`;

export const StyledTable = styled.table`
  & tbody > tr:nth-child(odd) {
    background-color: ${({ theme }) => theme.bgAccent};
  }

  padding-bottom: 20px;
`;

export const Form = styled.div`
  padding: 20px;
  margin-bottom: 50px;
  display: grid;
  grid-template-columns: auto auto;
  grid-gap: 20px;
`;
