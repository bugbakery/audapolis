{ pkgs ? import <nixpkgs> { } }:

(pkgs.buildFHSUserEnv {
  name = "audapolis-env";
  targetPkgs = pkgs: pkgs.atomEnv.packages ++ (with pkgs;
    [
      libxkbcommon
      xorg.libxshmfence
      libdrm
      poetry
	wget
unzip
    ]);
}).env
