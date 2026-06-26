import User, { IUser } from "../models/User";

/**
 * Finds a user by their Firebase UID.
 * Used to check if a user needs to be registered or logged in.
 * @param uid The unique ID provided by Firebase Auth
 * @returns The User document, if found, or null
 */
export const findUserByUid = async (uid: string): Promise<IUser | null> => {
  return await User.findOne({ firebaseUid: uid }).lean();
};

/**
 * Finds a user by their email address.
 * Used as fallback when UID lookup fails (e.g., UID changed).
 * @param email The user's email address
 * @returns The User document, if found, or null
 */
export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return await User.findOne({ email: email }).lean();
};

export const findAllUsers = async (): Promise<IUser[]> => {
  return await User.find();
};

/**
 * Updates the last login timestamp for existing user to the current time.
 * Should be called every time user loggs in.
 * @param user The existing User document retrieved from database
 * @returns The saved/updated User document
 */
export const updateUser = async (user: IUser, name?: string): Promise<IUser> => {
  // Updating last login and name from token
  user.lastLogin = new Date();
  if (name) {
    user.displayName = name;
  }
  return await user.save();
};

/**
 * Creates a new user document in the database with default preferences.
 * @param uid The unique ID provided by Firebase Auth
 * @param email The user's email address
 * @param name  The User's display name for their Google/Firebase profile.
 * @returns The newly created User document
 */
export const createUser = async (uid: string, email: string, name?: string): Promise<IUser> => {
  return await User.create({
    firebaseUid: uid,
    email: email,
    displayName: name || undefined,
    lastLogin: new Date(),
  });
};

/**
 * Updates a user's profile data (Display Name, Preferences, etc.)
 * @param uid The Firebase UID of the user to update
 * @param data The partial data to update (displayName, preferences, etc.)
 * @returns The updated User document or null if not found
 */
export const updateUserProfile = async (uid: string, data: Partial<IUser>): Promise<IUser | null> => {
  return await User.findOneAndUpdate(
    { firebaseUid: uid },
    { $set: data }, // Applies the updates
    { returnDocument: "after", runValidators: true }, // Returns the new user doc and does a schema check
  ).lean();
};

export const updateNotificationState = async (
  uid: string,
  notificationState: IUser["notificationState"],
): Promise<IUser | null> => {
  return await User.findOneAndUpdate(
    { firebaseUid: uid },
    { $set: { notificationState } },
    { returnDocument: "after", runValidators: true },
  );
};
