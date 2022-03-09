# Contributing to audapolis

💖 First of all: thank you for contributing to audapolis

This document contains some resources which should help you in that.

## Code Of Conduct

Everyone who contributes to audapolis must follow [our code of conduct](https://github.com/audapolis/audapolis/blob/main/CODE_OF_CONDUCT.md).
If you notice any violations, please reach out to us via the ways described in the code of conduct.

## How to Contribute

### Report a bug

Oops 😅 Thank you for catching this bug 🐛.
Please report this bug to us:

1. Ensure the bug was not already reported by searching through our [Issues](https://github.com/audapolis/audapolis/issues).
2. If you can't find a bug report for your bug, please [open a new one](https://github.com/audapolis/audapolis/issues/new). Please include **a title and clear description** and if possible as much of the following if possible:
- what one has to do to encounter the bug (**steps to reproduce**)
- what should have happened (**expected behaviour**)
- what happened instead (**actual behaviour**)
- anything else that might be relevant (**more information**)

For more information on how to write a good bug report, [check out the atom contribution guidelines](https://github.com/atom/atom/blob/master/CONTRIBUTING.md#how-do-i-submit-a-good-bug-report)

### "Audapolis should to X" or is behaving weird / unintuitively / not doing what you want?

If audapolis is behaving unintuitively, feels weird, doesn't do something you think it should or similar, please [open an issue](https://github.com/audapolis/audapolis/issues/new) if there doesn't exist one yet.

We cannot guarantee that we can implement every feature you want, but we are always happy to discuss them and try to figure out how they might fit into audapolis.

If you cannot figure out how to do something with audapolis you should be able to do, we consider [this a bug](#report-a-bug).

### I don't understand the documentation

If the documentation is unintuitive, we consider [this a bug](#report-a-bug).
If the documentation is missing something, we consider [this a bug](#report-a-bug).
If the documentation does not make you happy, we consider [this a bug](#report-a-bug).

### Write code / documentation to close issues

If you want to write code or documentation, please take a look at our issues.
We try to make them somewhat clear, but if you do not understand what an issue means, please ask us.
We sometimes tag issues as "good first issue", these could be interesting if this is you first contribution.

You can find instruction on how to set up a development environment in the [app/README.md](app/README.md) file.

If you have an issue that you understand and want to work on, feel free to do so. If you leave a short message in the issue thread, we can make sure that we do not have multiple people working on the same issue.

Once you have a fix, [open a new pull request](https://github.com/audapolis/audapolis/compare).
We will try to review your pull request as quick as possible.

To make sure we can merge it quickly, you can do a few things to help us:
1. Please make sure that the PR description includes all information we need to review this pull request (for example the issue this fixes, how it works).
2. Make sure that [our linters](https://pre-commit.com/) pass (for example by running `pre-commit` and/or `pre-commit run --all-files`)
3. Make sure that branch can be merged into the main branch

### Write code for new features

If you want to write code for something that is not already [described in an issue](https://github.com/audapolis/audapolis), please consider opening an issue first.
Especially if it's more than a small bugfix for an obvious bug.
We might have some opinions on whether / how your feature should be included into audapolis.

If you do not open an issue first, we might have a lot of review comments that need to be addressed before we can merge your issue or even have to close the PR entirely because we do not want to include the feature.

Opening an issue first also allows other users to comment on it, often leading to a better result.

### Write tests & documentation

If you want to write tests & documentation for existing features / behaviour, always feel free to do so and open a pull request.
If you have any questions while doing to, please open an issue or write us an email.
