import styled, { css } from 'styled-components';

export const Button = styled.button<{ primary?: boolean }>`
  /* This renders the buttons above... Edit me! */
  display: inline-block;
  text-align: center;
  border-radius: 5px;
  padding: 0.5rem 0;
  margin: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--fg-color);
  color: var(--fg-color);
  font-size: 18px;
  width: 265px;
  height: 40px;

  ${(props) =>
    props.primary &&
    css`
      background: var(--fg-color);
      color: var(--bg-color);
    `}
`;
