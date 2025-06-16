import * as E from "fp-ts/lib/Either";
import { describe, expect, it } from "vitest";

import { InstallationId } from "../../generated/notifications/InstallationId";
import { NHClientError } from "../notification";
import { testShaForPartitionRegex } from "../notificationhubServicePartition";

describe("NHClientError", () => {
  it("should decode a 404 as right", () => {
    expect(
      E.isRight(NHClientError.decode({ message: "foo", statusCode: 404 })),
    ).toBe(true);
  });

  it("should decode a 401 as left", () => {
    expect(
      E.isLeft(NHClientError.decode({ message: "foo", statusCode: 401 })),
    ).toBe(true);
  });
});

describe("Partition Regex", () => {
  it("should return true if sha is in partition 0 [0-3]", () => {
    const aValidInstallationId =
      "03b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const partition1RegexString = "^[0-3]";

    expect(
      testShaForPartitionRegex(partition1RegexString, aValidInstallationId),
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1RegexString, invalidInstallationId),
    ).toBe(false);

    const partition1Regex = RegExp("^[0-3]");
    expect(
      testShaForPartitionRegex(partition1Regex, aValidInstallationId),
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1Regex, invalidInstallationId),
    ).toBe(false);
  });

  it("should return true if sha is in partition 1 [4-7]", () => {
    const aValidInstallationId =
      "63b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const partition1Regex = "^[4-7]";

    expect(
      testShaForPartitionRegex(partition1Regex, aValidInstallationId),
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1Regex, invalidInstallationId),
    ).toBe(false);
  });

  it("should return true if sha is in partition 1 [8-b]", () => {
    const aValidInstallationId =
      "93b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const partition1Regex = "^[8-b]";

    expect(
      testShaForPartitionRegex(partition1Regex, aValidInstallationId),
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1Regex, invalidInstallationId),
    ).toBe(false);
  });

  it("should return true if sha is in partition 1 [c-f]", () => {
    const aValidInstallationId =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId =
      "03b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const partition1Regex = "^[c-f]";

    expect(
      testShaForPartitionRegex(partition1Regex, aValidInstallationId),
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1Regex, invalidInstallationId),
    ).toBe(false);
  });
});
