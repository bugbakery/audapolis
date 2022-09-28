# This file defines how PyOxidizer application building and packaging is
# performed. See PyOxidizer's documentation at
# https://pyoxidizer.readthedocs.io/en/stable/ for details of this
# configuration file format.

# Configuration files consist of functions which define build "targets."
# This function creates a Python executable and installs it in a destination
# directory.
def make_exe():
    # Obtain the default PythonDistribution for our build target. We link
    # this distribution into our produced executable and extract the Python
    # standard library from it.
    dist = default_python_distribution()

    # This function creates a `PythonPackagingPolicy` instance, which
    # influences how executables are built and how resources are added to
    # the executable. You can customize the default behavior by assigning
    # to attributes and calling functions.
    policy = dist.make_python_packaging_policy()

    # Enable support for non-classified "file" resources to be added to
    # resource collections.
    policy.allow_files = True

    # Controls whether `File` instances are emitted by the file scanner.
    policy.file_scanner_emit_files = True

    # Attempt to add resources relative to the built binary when
    # `resources_location` fails.
    policy.resources_location = "filesystem-relative:lib"

    # This variable defines the configuration of the embedded Python
    # interpreter. By default, the interpreter will run a Python REPL
    # using settings that are appropriate for an "isolated" run-time
    # environment.
    #
    # The configuration of the embedded Python interpreter can be modified
    # by setting attributes on the instance. Some of these are
    # documented below.
    python_config = dist.make_python_interpreter_config()

    # Set initial value for `sys.path`. If the string `$ORIGIN` exists in
    # a value, it will be expanded to the directory of the built executable.
    python_config.module_search_paths = ["$ORIGIN/lib"]

    # Run a Python module as __main__ when the interpreter starts.
    python_config.run_module = "run"

    # Produce a PythonExecutable from a Python distribution, embedded
    # resources, and other options. The returned object represents the
    # standalone executable that will be built.
    exe = dist.to_python_executable(
        name="server",

        # If no argument passed, the default `PythonPackagingPolicy` for the
        # distribution is used.
        packaging_policy=policy,

        # If no argument passed, the default `PythonInterpreterConfig` is used.
        config=python_config,
    )

    # Set the output filename for the license file
    exe.licenses_filename = "licenses.md"

    # Invoke `pip install` using a requirements file and add the collected resources
    # to our binary.
    # Normally the call would be this:
    #     exe.add_python_resources(exe.pip_install(["-r", "requirements.txt"]))
    # However this fails to add some native libraries, which vosk needs so
    # instead manually add them to the bundle. Our heuristic for "library" is
    # "anything that contains '.so.'".
    for resource in exe.pip_install(["-r", "requirements.txt"]):
        if type(resource) == "File" and ".so" in resource.path:
            print("Adding " + resource.path + " to bundle")
            resource.add_include = True
        exe.add_python_resource(resource)
    exe.add_python_resources(exe.read_package_root(CWD, ["run","app"]))

    # Return our `PythonExecutable` instance so it can be built and
    # referenced by other consumers of this target.
    return exe

def make_embedded_resources(exe):
    return exe.to_embedded_resources()

def make_install(exe):
    # Create an object that represents our installed application file layout.
    files = FileManifest()

    # Add the generated executable to our install layout in the root directory.
    files.add_python_resource(".", exe)
    return files

# Tell PyOxidizer about the build targets defined above.
register_target("exe", make_exe)
register_target("resources", make_embedded_resources, depends=["exe"], default_build_script=True)
register_target("install", make_install, depends=["exe"], default=True)

# Resolve whatever targets the invoker of this configuration file is requesting
# be resolved.
resolve_targets()
