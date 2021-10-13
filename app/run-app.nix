# to run audapolis on nixos in development mode you can run usi this nix file via `nix-shell run-ap.nix`
{ pkgs ? import <nixpkgs> { } }:

(pkgs.buildFHSUserEnv {
  name = "audapolis-env";
  targetPkgs = pkgs: pkgs.atomEnv.packages ++ (with pkgs;
    [
      libxkbcommon
      xorg.libxshmfence
      libdrm
      poetry
    ]);
  runScript = "npm run start";
}).env
