// this is stolen from https://github.com/segmentio/evergreen/pull/1382
// TODO: remove this when the pr is removed

/* eslint-disable */
export interface DefaultTheme {
  tokens: {
    colors: {
      gray900: string;
      gray800: string;
      gray700: string;
      gray600: string;
      gray500: string;
      gray400: string;
      gray300: string;
      gray200: string;
      gray100: string;
      gray90: string;
      gray75: string;
      gray50: string;
      blue900: string;
      blue800: string;
      blue700: string;
      blue600: string;
      blue500: string;
      blue400: string;
      blue300: string;
      blue200: string;
      blue100: string;
      blue50: string;
      blue25: string;
      red700: string;
      red600: string;
      red500: string;
      red100: string;
      red25: string;
      green900: string;
      green800: string;
      green700: string;
      green600: string;
      green500: string;
      green400: string;
      green300: string;
      green200: string;
      green100: string;
      green25: string;
      orange700: string;
      orange500: string;
      orange100: string;
      orange25: string;
      purple600: string;
      purple100: string;
      teal800: string;
      teal100: string;
      yellow800: string;
      yellow100: string;
      muted: string;
      default: string;
    };
    fontFamilies: {
      display: string;
      ui: string;
      mono: string;
    };
    text: {
      300: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      400: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      500: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      600: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
    };
    paragraph: {
      300: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      400: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
      500: {
        fontSize: string;
        fontWeight: number;
        lineHeight: string;
        letterSpacing: string;
      };
    };
    overlayBackgroundColor: string;
    codeBackgroundColor: string;
    codeBorderColor: string;
    fills: {
      neutral: { color: string; backgroundColor: string };
      blue: { color: string; backgroundColor: string };
      red: { color: string; backgroundColor: string };
      orange: { color: string; backgroundColor: string };
      yellow: { color: string; backgroundColor: string };
      green: { color: string; backgroundColor: string };
      teal: { color: string; backgroundColor: string };
      purple: { color: string; backgroundColor: string };
    };
    selectedOptionColor: string;
    borderRadius: number;
    primary: {
      base: string;
      hover: string;
      active: string;
      disabled: string;
    };
    intents: {
      info: {
        background: string;
        border: string;
        text: string;
        icon: string;
      };
      success: {
        background: string;
        border: string;
        text: string;
        icon: string;
      };
      warning: {
        background: string;
        border: string;
        text: string;
        icon: string;
      };
      danger: {
        background: string;
        border: string;
        text: string;
        icon: string;
      };
    };
    states: {
      default: { icon: string };
      muted: { icon: string };
      dark: { icon: string };
      disabled: { icon: string };
      selected: { icon: string };
    };
  };
  colors: {
    gray900: string;
    gray800: string;
    gray700: string;
    gray600: string;
    gray500: string;
    gray400: string;
    gray300: string;
    gray200: string;
    gray100: string;
    gray90: string;
    gray75: string;
    gray50: string;
    blue900: string;
    blue800: string;
    blue700: string;
    blue600: string;
    blue500: string;
    blue400: string;
    blue300: string;
    blue200: string;
    blue100: string;
    blue50: string;
    blue25: string;
    red700: string;
    red600: string;
    red500: string;
    red300: string;
    red100: string;
    red25: string;
    green900: string;
    green800: string;
    green700: string;
    green600: string;
    green500: string;
    green400: string;
    green300: string;
    green200: string;
    green100: string;
    green25: string;
    orange700: string;
    orange500: string;
    orange100: string;
    orange25: string;
    purple600: string;
    purple100: string;
    teal800: string;
    teal100: string;
    yellow800: string;
    yellow100: string;
    muted: string;
    default: string;
    dark: string;
    selected: string;
    tint1: string;
    tint2: string;
    overlay: string;
    yellowTint: string;
    greenTint: string;
    orangeTint: string;
    redTint: string;
    blueTint: string;
    purpleTint: string;
    tealTint: string;
    border: { default: string; muted: string };
    icon: {
      default: string;
      muted: string;
      disabled: string;
      selected: string;
    };
    text: { danger: string; success: string; info: string };
  };
  fills: {
    neutral: { color: string; backgroundColor: string };
    blue: { color: string; backgroundColor: string };
    red: { color: string; backgroundColor: string };
    orange: { color: string; backgroundColor: string };
    yellow: { color: string; backgroundColor: string };
    green: { color: string; backgroundColor: string };
    teal: { color: string; backgroundColor: string };
    purple: { color: string; backgroundColor: string };
  };
  intents: {
    info: {
      background: string;
      border: string;
      text: string;
      icon: string;
    };
    success: {
      background: string;
      border: string;
      text: string;
      icon: string;
    };
    warning: {
      background: string;
      border: string;
      text: string;
      icon: string;
    };
    danger: {
      background: string;
      border: string;
      text: string;
      icon: string;
    };
  };
  radii: string[];
  shadows: string[];
  fontFamilies: {
    display: string;
    mono: string;
    ui: string;
  };
  fontSizes: string[];
  fontWeights: { light: number; normal: number; semibold: number; bold: number };
  letterSpacings: {
    tightest: string;
    tighter: string;
    tight: string;
    normal: string;
    wide: string;
  };
  lineHeights: string[];
  zIndices: {
    focused: number;
    stack: number;
    positioner: number;
    overlay: number;
    toaster: number;
  };
  components: {
    Alert: { appearances: {}; sizes: {} };
    Avatar: { appearances: {}; sizes: {} };
    Badge: {
      baseStyle: {
        height: number;
        paddingY: number;
        paddingX: number;
        borderRadius: string;
        fontSize: string;
        textAlign: string;
        textDecoration: string;
        textTransform: string;
      };
      appearances: {};
      sizes: {};
    };
    Button: {
      baseStyle: {
        fontFamily: string;
        border: string;
        borderRadius: string;
        transition: string;
        _focus: { boxShadow: string };
        _disabled: { cursor: string; pointerEvents: string };
      };
      appearances: {
        default: {
          backgroundColor: string;
          _disabled: {
            color: string;
            borderColor: string;
          };
          _hover: { backgroundColor: string };
          _active: { backgroundColor: string };
        };
        minimal: {
          backgroundColor: string;
          _disabled: { color: string; opacity: number };
          _hover: { backgroundColor: string };
          _active: { backgroundColor: string };
        };
        destructive: {
          backgroundColor: string;
          borderColor: string;
          color: string;
          _hover: {
            backgroundColor: string;
            borderColor: string;
          };
          _disabled: {
            backgroundColor: string;
            borderColor: string;
          };
          _focus: {
            backgroundColor: string;
            boxShadow: string;
            borderColor: string;
          };
          _active: {
            backgroundColor: string;
            borderColor: string;
          };
        };
      };
      sizes: {
        small: {
          height: number;
          minWidth: number;
          fontSize: string;
          lineHeight: string;
          paddingLeft: number;
          paddingRight: number;
        };
        medium: {
          height: number;
          minWidth: number;
          fontSize: string;
          lineHeight: string;
          paddingLeft: number;
          paddingRight: number;
        };
        large: {
          height: number;
          minWidth: number;
          fontSize: string;
          lineHeight: string;
          paddingLeft: number;
          paddingRight: number;
        };
      };
    };
    Card: {
      baseStyle: { borderRadius: string };
      appearances: {};
      sizes: {};
    };
    Checkbox: {
      baseStyle: {};
      appearances: {
        default: {
          _base: { color: string; background: string };
          _disabled: {
            cursor: string;
            background: string;
            color: string;
          };
          _hover: {};
          _focus: {};
          _active: { background: string };
          _checked: { color: string; background: string };
          _checkedHover: { color: string; background: string };
          _checkedActive: {
            color: string;
            background: string;
          };
          _checkedDisabled: {
            color: string;
            background: string;
          };
        };
      };
      sizes: {};
    };
    Code: {
      baseStyle: {};
      appearances: {
        default: {
          backgroundColor: string;
          boxShadow: string;
          paddingX: number;
          paddingY: number;
          borderRadius: string;
        };
      };
      sizes: {};
    };
    DialogBody: { baseStyle: { paddingY: number; paddingX: number } };
    DialogFooter: {
      baseStyle: { paddingX: number; paddingBottom: number; paddingTop: number };
    };
    DialogHeader: {
      baseStyle: { paddingX: number; paddingTop: number; paddingBottom: number };
    };
    Group: {
      baseStyle: {
        _child: {
          '&:focus': { zIndex: string };
          '&:active': { zIndex: string };
        };
        _firstChild: {
          borderTopRightRadius: number;
          borderBottomRightRadius: number;
        };
        _middleChild: { borderRadius: number; marginLeft: string };
        _lastChild: {
          borderTopLeftRadius: number;
          borderBottomLeftRadius: number;
          marginLeft: string;
        };
      };
      appearances: {};
      sizes: {};
    };
    Heading: {
      baseStyle: {
        color: string;
        fontFamily: string;
        fontWeight: string;
      };
      appearances: {};
      sizes: {
        100: {
          fontSize: string;
          textTransform: string;
          lineHeight: string;
          letterSpacing: string;
          fontFamily: string;
          color: string;
        };
        200: {
          fontSize: string;
          lineHeight: string;
          letterSpacing: string;
          fontFamily: string;
          color: string;
        };
        300: {
          fontSize: string;
          lineHeight: string;
          letterSpacing: string;
          fontFamily: string;
        };
        400: {
          fontSize: string;
          lineHeight: string;
          letterSpacing: string;
          fontFamily: string;
        };
        500: {
          fontFamily: string;
          fontSize: string;
          fontWeight: string;
          letterSpacing: string;
          lineHeight: string;
        };
        600: {
          fontSize: string;
          lineHeight: string;
          fontWeight: string;
          letterSpacing: string;
        };
        700: {
          fontSize: string;
          lineHeight: string;
          fontWeight: string;
          letterSpacing: string;
        };
        800: {
          fontSize: string;
          lineHeight: string;
          fontWeight: string;
          letterSpacing: string;
        };
        900: {
          fontSize: string;
          lineHeight: string;
          fontWeight: string;
          letterSpacing: string;
        };
      };
    };
    Icon: { appearances: {}; sizes: {} };
    InlineAlert: { appearances: {}; sizes: {} };
    Input: {
      baseStyle: {
        borderRadius: string;
        fontFamily: string;
        lineHeight: string;
        fontSize: string;
        border: string;
        color: string;
        paddingX: number;
        transition: string;
        _placeholder: { color: string };
        _disabled: {
          cursor: string;
          backgroundColor: string;
          color: string;
        };
      };
      appearances: {
        default: {
          backgroundColor: string;
          borderColor: string;
          _focus: {
            zIndex: string;
            boxShadow: string;
            borderColor: string;
          };
          _invalid: { borderColor: string };
        };
        none: { backgroundColor: string };
      };
      sizes: {
        small: { height: number };
        medium: { height: number };
        large: { height: number; lineHeight: string };
      };
    };
    Label: {
      baseStyle: {
        color: string;
        fontFamily: string;
        fontWeight: string;
      };
      appearances: {};
      sizes: {
        100: {
          fontSize: string;
          textTransform: string;
          lineHeight: string;
          letterSpacing: string;
          fontFamily: string;
          color: string;
        };
        200: {
          fontSize: string;
          lineHeight: string;
          letterSpacing: string;
          fontFamily: string;
          color: string;
        };
        300: {
          fontSize: string;
          lineHeight: string;
          letterSpacing: string;
          fontFamily: string;
        };
        400: {
          fontSize: string;
          lineHeight: string;
          letterSpacing: string;
          fontFamily: string;
        };
        500: {
          fontFamily: string;
          fontSize: string;
          fontWeight: string;
          letterSpacing: string;
          lineHeight: string;
        };
        600: {
          fontSize: string;
          lineHeight: string;
          fontWeight: string;
          letterSpacing: string;
        };
        700: {
          fontSize: string;
          lineHeight: string;
          fontWeight: string;
          letterSpacing: string;
        };
        800: {
          fontSize: string;
          lineHeight: string;
          fontWeight: string;
          letterSpacing: string;
        };
        900: {
          fontSize: string;
          lineHeight: string;
          fontWeight: string;
          letterSpacing: string;
        };
      };
    };
    List: { baseStyle: {}; appearances: {}; sizes: {} };
    Link: {
      baseStyle: {
        borderRadius: string;
        transition: string;
        textDecoration: string;
        _hover: {};
        _active: {};
        _focus: {};
      };
      appearances: {};
      sizes: {};
    };
    MenuItem: {
      baseStyle: {
        outline: string;
        textDecoration: string;
        display: string;
        position: string;
        paddingX: number;
        _isSelectable: { cursor: string };
        _disabled: { cursor: string; pointerEvents: string };
      };
      appearances: {
        default: {
          backgroundColor: string;
          '&:before': {
            content: string;
            position: string;
            left: number;
            top: number;
            bottom: number;
            width: number;
            borderRadius: string;
            backgroundColor: string;
            transition: string;
            transformOrigin: string;
            transform: string;
          };
          _hover: { backgroundColor: string };
          _focus: { backgroundColor: string };
          _active: {
            backgroundColor: string;
            '&:before': { transform: string };
          };
          _current: {
            backgroundColor: string;
            '&:before': { transform: string };
          };
        };
      };
    };
    Option: {
      baseStyle: {
        outline: string;
        textDecoration: string;
        display: string;
        position: string;
        backgroundColor: string;
        _before: {
          content: string;
          position: string;
          left: number;
          top: number;
          bottom: number;
          width: number;
          borderRadius: string;
          backgroundColor: string;
          transition: string;
          transformOrigin: string;
          transform: string;
        };
        _isSelectable: { cursor: string };
        _hover: { backgroundColor: string };
        _focus: { backgroundColor: string };
        _active: { backgroundColor: string };
        _selected: {
          backgroundColor: string;
          ' span': { color: string };
          '&:before': { transform: string };
        };
        _disabled: {
          opacity: number;
          pointerEvents: string;
          cursor: string;
        };
      };
    };
    Pane: { appearances: {}; sizes: {} };
    Paragraph: {
      baseStyle: { marginTop: number; marginBottom: number };
      appearances: {};
      sizes: {
        300: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        400: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        500: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        600: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        small: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        medium: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        large: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
      };
    };
    Radio: {
      baseStyle: {};
      appearances: {
        default: {
          _base: { color: string; background: string };
          _disabled: {
            cursor: string;
            background: string;
            color: string;
          };
          _hover: {};
          _focus: {};
          _active: { background: string };
          _checked: { color: string; background: string };
          _checkedHover: { color: string; background: string };
          _checkedActive: {
            color: string;
            background: string;
          };
          _checkedDisabled: {
            color: string;
            background: string;
          };
        };
      };
      sizes: {};
    };
    Select: {
      baseStyle: {
        fontFamily: string;
        borderRadius: string;
        border: number;
      };
      appearances: {
        default: {
          backgroundColor: string;
          color: string;
          _disabled: {
            cursor: string;
            color: string;
            borderColor: string;
          };
          _hover: {
            borderColor: string;
            backgroundColor: string;
          };
          _invalid: { borderColor: string };
          _focus: { boxShadow: string };
          _active: { backgroundColor: string };
        };
      };
      sizes: {
        small: {
          height: number;
          fontSize: string;
          lineHeight: string;
        };
        medium: {
          height: number;
          fontSize: string;
          lineHeight: string;
        };
        large: {
          height: number;
          fontSize: string;
          lineHeight: string;
        };
      };
    };
    Spinner: {
      baseStyle: { color: string };
      appearances: {};
      sizes: {
        small: { width: number; height: number };
        medium: { width: number; height: number };
        large: { width: number; height: number };
      };
    };
    Switch: {
      baseStyle: {};
      appearances: {
        default: {
          _base: { color: string; backgroundColor: string };
          _disabled: { cursor: string; opacity: number };
          _hover: { backgroundColor: string };
          _focus: {};
          _active: { backgroundColor: string };
          _checked: { backgroundColor: string; color: string };
          _checkedHover: {
            backgroundColor: string;
            color: string;
          };
          _checkedActive: {
            backgroundColor: string;
            color: string;
          };
          _checkedDisabled: {};
        };
      };
      sizes: {};
    };
    Tab: {
      baseStyle: { fontFamily: string; fontWeight: number };
      appearances: {
        primary: {
          color: string;
          paddingTop: string;
          paddingBottom: string;
          paddingLeft: string;
          paddingRight: string;
          position: string;
          ':not(:last-child)': {};
          _before: {
            content: string;
            position: string;
            bottom: number;
            right: number;
            height: string;
            borderRadius: string;
            backgroundColor: string;
            width: '100%';
            transition: string;
            transform: string;
            transformOrigin: string;
          };
          _hover: { color: string };
          _current: {
            color: string;
            '&:before': { transform: string };
            '&:focus': { color: string };
          };
          _focus: {
            boxShadow: string;
            color: string;
          };
          _disabled: {
            pointerEvents: string;
            cursor: string;
            color: string;
            '&:before': { backgroundColor: string };
          };
        };
        secondary: {
          paddingX: string;
          paddingY: string;
          borderRadius: string;
          color: string;
          ':not(:last-child)': {};
          _hover: {
            backgroundColor: string;
            color: string;
          };
          _active: { backgroundColor: string };
          _current: {
            backgroundColor: string;
            color: string;
          };
          _focus: { boxShadow: string };
          _disabled: {
            pointerEvents: string;
            cursor: string;
            color: string;
            '&[aria-current=string], &[aria-selected=string]': {
              backgroundColor: string;
            };
          };
        };
      };
    };
    Table: {
      baseStyle: { borderRadius: string; border: string };
      appearances: {};
      sizes: {};
    };
    TableCell: {
      baseStyle: { paddingX: number };
      appearances: {
        default: {
          _focus: { outline: string; background: string };
        };
      };
      sizes: {};
    };
    TableHead: {
      baseStyle: {
        borderBottom: string;
        background: string;
        height: string;
        fontSize: string;
        fontWeight: string;
        lineHeight: string;
        letterSpacing: string;
        fontFamily: string;
        color: string;
        textTransform: string;
      };
      appearances: {};
      sizes: {};
    };
    TableRow: {
      baseStyle: {
        outline: string;
        textDecoration: string;
        height: number;
        _isSelectable: { cursor: string };
      };
      appearances: {
        default: { _hover: {}; _focus: {}; _active: {}; _current: {} };
      };
    };
    TagInput: {
      baseStyle: {
        paddingY: string;
        backgroundColor: string;
        borderRadius: string;
      };
      appearances: {
        default: {
          _focused: {
            outline: string;
            zIndex: string;
            transition: string;
            boxShadow: string;
          };
          _disabled: {
            cursor: string;
            backgroundColor: string;
          };
        };
      };
      sizes: {};
    };
    Text: {
      baseStyle: {};
      appearances: {};
      sizes: {
        300: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        400: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        500: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        600: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        small: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        medium: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
        large: {
          fontSize: string;
          fontWeight: string;
          lineHeight: string;
          letterSpacing: string;
        };
      };
    };
    TextDropdownButton: {
      baseStyle: {
        fontFamily: string;
        backgroundColor: string;
        borderRadius: string;
        paddingX: number;
        marginX: -4;
        paddingY: number;
        marginY: -2;
        color: string;
        _disabled: { cursor: string; pointerEvents: string };
        _focus: { boxShadow: string };
      };
      appearances: {};
      sizes: {
        small: { fontSize: string; lineHeight: string };
        medium: { fontSize: string; lineHeight: string };
        large: { fontSize: string; lineHeight: string };
      };
    };
    Tooltip: {
      baseStyle: {
        paddingY: number;
        paddingX: number;
        maxWidth: number;
        borderRadius: string;
        elevation: string;
      };
      appearances: {
        card: { backgroundColor: string };
        default: { color: string; backgroundColor: string };
      };
      sizes: {};
    };
  };
}
/* eslint-enable */

declare module 'evergreen-ui' {
  export interface Theme extends DefaultTheme {
    colors: {
      speakers: string[];
      playAccent: string;
    } & DefaultTheme.colors;
  }
}
